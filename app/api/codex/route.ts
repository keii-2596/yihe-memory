import { getAppUser } from '../../chatgpt-auth';
import { readCodexStatus } from '../../../lib/codex-gateway';

export async function GET(){
  const user=await getAppUser();
  const status=await readCodexStatus(user);
  return Response.json(status,{status:!user?401:status.allowed?200:403});
}
