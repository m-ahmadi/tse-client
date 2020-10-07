function parseColstr(str='') {
  if (!str) return;
  const chr = str.indexOf(' ') !== -1 ? ' ' : ',';
  const res = str.split(chr).map(i => {
    if (!/^\d{1,2}$|^\d{1,2}:\w+$/.test(i)) return;
    const row = i.indexOf(':') !== -1
      ? [  +i.split(':')[0],  i.split(':')[1]  ]
      : [  +i  ];
    if (Number.isNaN(row[0]) || row[0] === undefined) return;
    return row;
  });
  return res.filter(i=>!i).length ? undefined : res;
}

module.exports = parseColstr;