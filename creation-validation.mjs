const MAX_BYTES=1050000, MAX_URL=1400023;
export function decodePreview(value){
  if(typeof value!=='string'||value.length>MAX_URL||!value.startsWith('data:image/jpeg;base64,'))throw new Error('Invalid preview');
  const encoded=value.slice(23);
  if(!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)||encoded.length%4!==0)throw new Error('Invalid base64');
  const raw=Buffer.from(encoded,'base64');
  if(raw.length<4||raw.length>MAX_BYTES||raw[0]!==255||raw[1]!==216||raw[2]!==255||raw.at(-2)!==255||raw.at(-1)!==217)throw new Error('Invalid JPEG');
  return raw;
}
export function validateCreations(creations){
  if(!Array.isArray(creations)||creations.length>2)throw new Error('Too many creations');
  const kinds=new Set(),summaries=[],attachments=[];
  for(const c of creations){
    if(!c||!['shirt','tube'].includes(c.kind)||kinds.has(c.kind)||typeof c.summary!=='string'||!c.summary.trim()||c.summary.length>3500)throw new Error('Invalid creation');
    kinds.add(c.kind);summaries.push((c.kind==='shirt'?'T-SHIRT — TEXTILE NON FOURNI, FOURNI PAR LE CLIENT.':'TUBE PERSONNALISÉ.')+'\n'+c.summary.trim());
    attachments.push({name:`badonline-${c.kind}.jpg`,bytes:decodePreview(c.preview)});
    if(c.photo!==undefined){if(c.kind!=='tube')throw new Error('Unexpected photo');attachments.push({name:'badonline-photo-tube.jpg',bytes:decodePreview(c.photo)});}
  }
  return {summary:summaries.join('\n\n'),attachments};
}
