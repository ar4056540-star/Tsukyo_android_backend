import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, AppTheme } from '../types';
import { authApi, clearToken, getToken, subscribeToEvents, usersApi } from './api';

export interface CurrentUser { uid: string; email?: string; displayName?: string; photoURL?: string }
interface AuthContextType {
  currentUser: CurrentUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  needsVybePasswordSetup: boolean;
  setNeedsVybePasswordSetup: (v:boolean)=>void;
  loginWithGoogle: ()=>Promise<UserProfile>;
  loginWithEmail: (email:string,pass:string)=>Promise<UserProfile>;
  signupWithEmail: (email:string,pass:string,username:string,name:string)=>Promise<UserProfile>;
  logout: ()=>Promise<void>;
  resetPassword: (email:string)=>Promise<void>;
  setVybePassword: (pass:string)=>Promise<void>;
  updateUserProfile: (data:Partial<UserProfile>)=>Promise<void>;
  switchAccount: (accountEmail:string)=>Promise<void>;
  refreshProfile: ()=>Promise<void>;
  savedAccounts: Array<{uid:string;email:string;displayName:string;photoURL:string;username:string}>;
}
const AuthContext=createContext<AuthContextType>({currentUser:null,userProfile:null,loading:true,needsVybePasswordSetup:false,setNeedsVybePasswordSetup:()=>{},loginWithGoogle:async()=>{throw new Error('Google sign-in is not configured on the custom backend.');},loginWithEmail:async()=>{throw new Error('Not implemented');},signupWithEmail:async()=>{throw new Error('Not implemented');},logout:async()=>{},resetPassword:async()=>{},setVybePassword:async()=>{},updateUserProfile:async()=>{},switchAccount:async()=>{},refreshProfile:async()=>{},savedAccounts:[]});

function profileToUser(p:UserProfile):CurrentUser{return {uid:p.userId,email:p.email,displayName:p.displayName,photoURL:p.photoURL};}

export const AuthProvider:React.FC<{children:React.ReactNode}>=({children})=>{
  const [currentUser,setCurrentUser]=useState<CurrentUser|null>(null);
  const [userProfile,setUserProfile]=useState<UserProfile|null>(null);
  const [loading,setLoading]=useState(true);
  const [needsVybePasswordSetup,setNeedsVybePasswordSetup]=useState(false);
  const [savedAccounts,setSavedAccounts]=useState<Array<{uid:string;email:string;displayName:string;photoURL:string;username:string}>>(()=>{try{return JSON.parse(localStorage.getItem('vybe_saved_accounts')||'[]')}catch{return[]}});
  const saveAccount=(p:UserProfile)=>setSavedAccounts(prev=>{const next=[{uid:p.userId,email:p.email||'',displayName:p.displayName||'',photoURL:p.photoURL||'',username:p.username||''},...prev.filter(x=>x.uid!==p.userId)].slice(0,5);localStorage.setItem('vybe_saved_accounts',JSON.stringify(next));return next;});
  const applyProfile=(p:UserProfile)=>{setUserProfile(p);setCurrentUser(profileToUser(p));saveAccount(p);return p;};

  useEffect(()=>{
    let active=true;
    const boot=async()=>{
      if(!getToken()){if(active)setLoading(false);return;}
      try{const p=await authApi.me();if(active)applyProfile(p);}catch{clearToken();if(active){setCurrentUser(null);setUserProfile(null);}}finally{if(active)setLoading(false);}
    };
    boot();
    return()=>{active=false};
  },[]);

  useEffect(()=>{
    if(!currentUser)return;
    const unsubscribe=subscribeToEvents(event=>{if(event.topic===`profile:${currentUser.uid}`)void refreshProfile();});
    return()=>unsubscribe();
  },[currentUser?.uid]);

  const loginWithEmail=async(email:string,pass:string)=>applyProfile(await authApi.login(email,pass));
  const signupWithEmail=async(email:string,pass:string,username:string,name:string)=>applyProfile(await authApi.register(email,pass,username,name));
  const loginWithGoogle=async()=>{throw new Error('Google sign-in is not configured on the custom backend. Use email authentication.');};
  const logout=async()=>{await authApi.logout();setCurrentUser(null);setUserProfile(null);};
  const resetPassword=async(email:string)=>{await authApi.resetPassword(email);};
  const setVybePassword=async(_pass:string)=>setNeedsVybePasswordSetup(false);
  const updateUserProfile=async(data:Partial<UserProfile>)=>{if(!userProfile)return;const next={...data};const updated=(await usersApi.update(userProfile.userId,next)).user;applyProfile(updated);};
  const switchAccount=async(_accountEmail:string)=>{await logout()};
  const refreshProfile=async()=>{if(!userProfile)return;try{applyProfile((await usersApi.get(userProfile.userId)).user)}catch{}};

  return <AuthContext.Provider value={{currentUser,userProfile,loading,needsVybePasswordSetup,setNeedsVybePasswordSetup,loginWithGoogle,loginWithEmail,signupWithEmail,logout,resetPassword,setVybePassword,updateUserProfile,switchAccount,refreshProfile,savedAccounts}}>{children}</AuthContext.Provider>;
};
export const useAuth=()=>useContext(AuthContext);
