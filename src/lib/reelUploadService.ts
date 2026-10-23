import { Reel, UserProfile } from '../types';
import { uploadMedia } from './api';
import { createReel } from './dataService';

export type ReelPublishStage='validating'|'uploading'|'finalizing'|'complete'|'error';
export interface ReelUploadProgressCallback {(percentage:number,bytesTransferred:number,totalBytes:number):void}
export interface UploadReelParams {file:File;caption?:string;audioTitle?:string;ownerProfile:UserProfile;onProgress?:ReelUploadProgressCallback;onStageChange?:(stage:ReelPublishStage)=>void;signal?:AbortSignal}

export async function uploadAndPublishReel(params:UploadReelParams):Promise<Reel>{
  const {file,caption='',audioTitle='Original Sound — VYBE',ownerProfile,onProgress,onStageChange,signal}=params;
  if(!(file instanceof File)){onStageChange?.('error');throw new Error('Invalid file provided for Reel upload.')}
  if(!file.type.startsWith('video/')&&!['mp4','mov','webm','m4v','avi','mkv','3gp','ogv'].includes(file.name.split('.').pop()?.toLowerCase()||'')){onStageChange?.('error');throw new Error('Selected file is not a supported video format.')}
  if(signal?.aborted){onStageChange?.('error');throw new Error('Upload was cancelled.')}
  onStageChange?.('uploading');
  try{
    const result=await uploadMedia(file,'reels',(p,loaded,total)=>onProgress?.(p,loaded,total));
    if(signal?.aborted){onStageChange?.('error');throw new Error('Upload was cancelled.')}
    onStageChange?.('finalizing');
    const reel=await createReel({ownerId:ownerProfile.userId,ownerUsername:ownerProfile.username,ownerDisplayName:ownerProfile.displayName,ownerPhotoURL:ownerProfile.photoURL,caption,mediaURL:result.url,audioTitle});
    onStageChange?.('complete');return reel;
  }catch(error){onStageChange?.('error');throw error}
}
