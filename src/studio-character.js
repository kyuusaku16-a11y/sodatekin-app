// Positions are in the shared 400 × 552 character viewport. The atlas has a
// registered front and rear portrait, so growth, crops and light use one map.
const regions = {
  chest:     { x: 0,  y: 153, rx: 70, ry: 45, strength: .55, side: 'front' },
  back:      { x: 0,  y: 151, rx: 76, ry: 65, strength: .55, side: 'back' },
  shoulders: { x: 52, y: 124, rx: 38, ry: 32, strength: .65 },
  arms:      { x: 67, y: 170, rx: 30, ry: 49, strength: .75 },
  abs:       { x: 0,  y: 209, rx: 63, ry: 42, strength: .40, side: 'front' },
  glutes:    { x: 25, y: 262, rx: 49, ry: 44, strength: .55, side: 'back' },
  thighs:    { x: 32, y: 323, rx: 45, ry: 55, strength: .70 },
  calves:    { x: 44, y: 433, rx: 35, ry: 51, strength: .75 },
};

function visibleRegions(back) {
  return Object.entries(regions).filter(([, part]) => !part.side || part.side === (back ? 'back' : 'front'));
}

export function studioVisibleParts(back) {
  return visibleRegions(back).map(([id]) => id);
}

export function studioMesh(values, back) {
  const muscles = visibleRegions(back).map(([id, part]) => ({
    ...part, growth: (values[id] - 1) / 998 * part.strength,
  }));
  const vertices = [], triangles = [];
  const columns = 41;
  for (let row = 0; row <= 46; row++) {
    const y = row * 12;
    for (let col = 0; col < columns; col++) {
      const x = col * 10;
      let shifted = x;
      for (const part of muscles) {
        const dx = x - (200 + Math.sign(x - 200) * part.x);
        const distance = (dx / part.rx) ** 2 + ((y - part.y) / part.ry) ** 2;
        shifted += part.growth * dx * Math.max(0, 1 - distance) ** 2;
      }
      const uv = [x / 400, (y / 552 + Number(back)) / 2];
      vertices.push([shifted, y, ...uv, ...uv, ...uv, ...uv, ...uv, 0, 0, 1]);
      if (row && col) {
        const i = vertices.length - 1;
        triangles.push(i - columns - 1, i - columns, i, i - columns - 1, i, i - 1);
      }
    }
  }
  return { vertices, triangles };
}

export function studioLight(parts, back) {
  const lights = visibleRegions(back).filter(([id]) => parts.some(part => part.id === id && part.xp > 0));
  return '<div class="studio-light" aria-hidden="true"><div class="studio-light-frame">' + lights.map(([id, part]) => {
    const centers = part.x ? [200 - part.x, 200 + part.x] : [200];
    return centers.map(x => `<i data-muscle="${id}" style="left:${x / 4}%;top:${part.y / 5.52}%;width:${part.rx / 4}%;height:${part.ry / 5.52}%"></i>`).join('');
  }).join('') + '</div></div>';
}

export function studioGrowthHighlight(row, back) {
  const part = regions[row.id];
  if (!part || (part.side && part.side !== (back ? 'back' : 'front'))) return '';
  const centers = part.x ? [200 - part.x, 200 + part.x] : [200];
  return centers.map(x => `<ellipse class="growth-muscle ${row.primary ? 'is-primary' : 'is-secondary'}" data-muscle="${row.id}" cx="${x}" cy="${part.y}" rx="${part.rx * .47}" ry="${part.ry * .55}"/>`).join('');
}

export function studioCrop(id) {
  const part = regions[id];
  const oneSide = id === 'arms' || id === 'shoulders';
  const width = oneSide ? part.rx * 2.3 : 2 * (part.x + part.rx);
  const height = part.ry * 2.2;
  return { x: 200 + (oneSide ? part.x : 0) - width / 2, y: part.y - height / 2, width, height };
}

// Keep the chosen view when a leading muscle is visible (e.g. thighs in a
// squat). A back-dominant lift can briefly show the rear during its light.
export function studioReactionBack(parts, back) {
  const highest = Math.max(...parts.map(part => part.xp));
  const leaders = new Set(parts.filter(part => part.xp === highest).map(part => part.id));
  return visibleRegions(back).some(([id]) => leaders.has(id)) ? back : !back;
}

export function paintStudio2D(context, atlas, values, back) {
  const width = context.canvas.width, height = context.canvas.height;
  const frame = back ? height : 0;
  if (Object.values(values).every(value => value === 1)) {
    context.drawImage(atlas, 0, frame, width, height, 0, 0, width, height);
    return;
  }
  // The studio mesh only displaces x. Reuse its horizontal mapping in narrow
  // scan bands when WebGL is unavailable; shared pixel edges avoid alpha seams.
  const { vertices } = studioMesh(values, back);
  const columns = 41, rowHeight = 24, cellWidth = 20, band = 4;
  for (let y = 0; y < height; y += band) {
    const row = Math.floor(y / rowHeight) * columns;
    const t = (y % rowHeight + band / 2) / rowHeight;
    let left = 0;
    for (let col = 1; col < columns; col++) {
      const x0 = vertices[row + col][0], x1 = vertices[row + columns + col][0];
      const right = Math.round(2 * (x0 + (x1 - x0) * t));
      context.drawImage(atlas, (col - 1) * cellWidth, frame + y, cellWidth, band, left, y, right - left, band);
      left = right;
    }
  }
}
