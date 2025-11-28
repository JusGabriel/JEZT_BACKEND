const normalizeNumber = (raw) => {
  if (!raw) return null;

  let n = String(raw).replace(/[^\d]/g, "");
  if (n.length === 9) n = "593" + n; 
  if (n.length === 10 && n.startsWith("0")) n = "593" + n.slice(1); 

  return `${n}@c.us`;
};

export {
  normalizeNumber
};

