import { ZodError } from "zod";
import { searchSchema, searchCompanies, CompanySearchError } from "@/lib/company-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request:Request):Promise<Response> {
  const headers={"Cache-Control":"private, no-store"};
  try {
    const params=new URL(request.url).searchParams;
    if([...params.keys()].some(k=>params.getAll(k).length>1)) return Response.json({error:"Paramètre de recherche répété."},{status:400,headers});
    const input=searchSchema.parse(Object.fromEntries(params));
    return Response.json(await searchCompanies(input),{headers});
  } catch(error) {
    if(error instanceof ZodError) return Response.json({error:"Filtres invalides. Vérifiez le territoire, le secteur, l’effectif et la page."},{status:400,headers});
    if(error instanceof CompanySearchError) return Response.json({error:error.message},{status:error.status,headers:{...headers,...(error.retryAfter?{"Retry-After":error.retryAfter}:{})}});
    return Response.json({error:"La recherche n’a pas pu aboutir. Réessayez."},{status:500,headers});
  }
}
