import React,{createContext,useContext,useEffect,useState,useCallback} from 'react';
import { appLockApi, subscribeToEvents } from './api';
import { useAuth } from './authContext';

interface AppLockContextType {isLocked:boolean;isAppLockConfigured:boolean;lockApp:()=>void;unlockWithPin:(pin:string)=>Promise<boolean>;setupPin:(pin:string)=>Promise<void>;setPinCode:(pin:string)=>Promise<void>;disableAppLock:(pin?:string)=>Promise<boolean>;removePinCode:(pin?:string)=>Promise<boolean>;resetAppLockWithAuth:()=>void}
const AppLockContext=createContext<AppLockContextType>({isLocked:false,isAppLockConfigured:false,lockApp:()=>{},unlockWithPin:async()=>false,setupPin:async()=>{},setPinCode:async()=>{},disableAppLock:async()=>false,removePinCode:async()=>false,resetAppLockWithAuth:()=>{}});

export const AppLockProvider:React.FC<{children:React.ReactNode}>=({children})=>{
  const {currentUser}=useAuth();
  const [isLocked,setIsLocked]=useState(false); const [isAppLockConfigured,setIsAppLockConfigured]=useState(false); const [unlockedForUserId,setUnlockedForUserId]=useState<string|null>(null);
  const uid=currentUser?.uid;
  const load=useCallback(async()=>{if(!uid){setIsAppLockConfigured(false);setIsLocked(false);return;}try{const s=await appLockApi.status(uid);setIsAppLockConfigured(s.configured);setIsLocked(s.configured&&unlockedForUserId!==uid);}catch{setIsAppLockConfigured(false);setIsLocked(false)}},[uid,unlockedForUserId]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{if(!uid)return;const unsub=subscribeToEvents(e=>{if(e.topic===`profile:${uid}`)void load()});return unsub},[uid,load]);
  const lockApp=()=>{if(uid&&isAppLockConfigured){setUnlockedForUserId(null);setIsLocked(true)}};
  const unlockWithPin=async(pin:string)=>{if(!uid||!isAppLockConfigured){setIsLocked(false);return true}try{const r=await appLockApi.verify(uid,pin);if(r.ok){setUnlockedForUserId(uid);setIsLocked(false);return true}return false}catch{return false}};
  const setupPin=async(pin:string)=>{if(!uid)throw new Error('You must be signed in to configure AppLock.');await appLockApi.setup(uid,pin);setUnlockedForUserId(uid);setIsAppLockConfigured(true);setIsLocked(false)};
  const disableAppLock=async(pin?:string)=>{if(!uid)return false;try{await appLockApi.disable(uid,pin);setUnlockedForUserId(null);setIsAppLockConfigured(false);setIsLocked(false);return true}catch{return false}};
  const resetAppLockWithAuth=()=>{setUnlockedForUserId(null);setIsAppLockConfigured(false);setIsLocked(false)};
  return <AppLockContext.Provider value={{isLocked,isAppLockConfigured,lockApp,unlockWithPin,setupPin,setPinCode:setupPin,disableAppLock,removePinCode:disableAppLock,resetAppLockWithAuth}}>{children}</AppLockContext.Provider>;
};
export const useAppLock=()=>useContext(AppLockContext);
