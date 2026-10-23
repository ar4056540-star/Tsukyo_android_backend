import { uploadMedia } from './api';
export interface UploadProgressCallback { (percentage:number):void }
export async function uploadMediaFile(file:File,folder:'reels'|'posts'|'stories'|'avatars'|'messages'='reels',onProgress?:UploadProgressCallback):Promise<string>{
  if(!(file instanceof File))throw new Error('Invalid file provided for upload.');
  const result=await uploadMedia(file,folder,(percentage)=>onProgress?.(percentage));
  return result.url;
}
