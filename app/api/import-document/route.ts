import { extractText, getDocumentProxy } from 'unpdf';

const MAX_PDF_BYTES=12_000_000;

export async function POST(request:Request){
  const form=await request.formData();
  const file=form.get('file');
  if(!(file instanceof File)||file.type!=='application/pdf')return Response.json({error:'请选择 PDF 文件'},{status:400});
  if(file.size>MAX_PDF_BYTES)return Response.json({error:'PDF 不能超过 12MB'},{status:413});
  try{
    const pdf=await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const result=await extractText(pdf,{mergePages:true});
    const text=String(result.text).replace(/\n{3,}/g,'\n\n').trim().slice(0,60_000);
    if(text.length<20)return Response.json({error:'没有识别到可用文字，扫描版 PDF 请先做 OCR'},{status:422});
    return Response.json({title:file.name.replace(/\.pdf$/i,''),text,totalPages:result.totalPages});
  }catch{return Response.json({error:'PDF 解析失败，可能是加密或损坏文件'},{status:422});}
}
