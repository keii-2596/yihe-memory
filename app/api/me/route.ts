import { getAppUser, getAuthOptions } from '../../chatgpt-auth';

export async function GET() {
  const user=await getAppUser();
  return Response.json(user?{authenticated:true,...user,authOptions:getAuthOptions()}:{authenticated:false,authOptions:getAuthOptions()});
}
