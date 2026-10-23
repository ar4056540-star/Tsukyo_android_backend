import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { getAvatarUrl, DEFAULT_PROFILE_AVATAR } from '../lib/constants';
import { compressAvatarFile } from '../lib/imageCompressor';
import { uploadMedia } from '../lib/api';
import { X, Camera, Check, Upload, Loader2 } from 'lucide-react';

interface EditProfileModalProps {
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose }) => {
  const { userProfile, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [photoURL, setPhotoURL] = useState(getAvatarUrl(userProfile?.photoURL));
  const [saving, setSaving] = useState(false);
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
        setUploadError(null);
        setIsCompressingAvatar(true);
        const compressedAvatar = await compressAvatarFile(file);
        setSelectedAvatarFile(file);
        setPhotoURL(compressedAvatar);
      } catch (err) {
        console.error('Failed to process avatar:', err);
        setUploadError(err instanceof Error ? err.message : 'Could not process avatar image. Please choose another image.');
      } finally {
        setIsCompressingAvatar(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || isCompressingAvatar) return;
    setSaving(true);

    try {
      let nextPhotoURL = photoURL;
      if (selectedAvatarFile) {
        const uploaded = await uploadMedia(selectedAvatarFile, 'avatars');
        nextPhotoURL = uploaded.url;
      }
      await updateUserProfile({
        displayName: displayName.trim() || userProfile?.displayName,
        bio: bio.trim(),
        photoURL: nextPhotoURL,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setUploadError(message);
      alert('Failed to save profile: ' + message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 select-none">
      <div className="relative w-full max-w-[480px] h-[90vh] bg-[#0b0c0e] rounded-t-3xl sm:rounded-3xl border border-[#222634] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 bg-[#11131a] border-b border-[#20232e] flex items-center justify-between flex-shrink-0">
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-base font-bold text-white">Edit Profile</h3>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Avatar Edit */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <img
                src={photoURL}
                alt="Profile avatar"
                className="w-24 h-24 rounded-full object-cover ring-2 ring-pink-500 p-0.5 bg-[#0b0c0e]"
              />
              {isCompressingAvatar && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-pink-500 hover:bg-pink-600 text-white rounded-full p-2 ring-2 ring-[#0b0c0e] shadow cursor-pointer transition">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isCompressingAvatar}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-slate-400">Choose an avatar or upload your photo</p>
            {uploadError && <p className="text-xs text-red-400 mt-1 text-center">{uploadError}</p>}

            {/* Preset Avatars */}
            <div className="flex space-x-2 mt-3">
              {PRESET_AVATARS.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="Preset"
                  onClick={() => setPhotoURL(url)}
                  className={`w-9 h-9 rounded-full object-cover cursor-pointer border-2 transition ${
                    photoURL === url ? 'border-pink-500 scale-110' : 'border-transparent opacity-60'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#181a24] text-white text-sm rounded-xl px-3.5 py-2.5 border border-[#2b2f3d] focus:outline-none focus:border-pink-500"
              maxLength={100}
            />
          </div>

          {/* Username (Read only info) */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Username</label>
            <input
              type="text"
              value={`@${userProfile?.username || ''}`}
              disabled
              className="w-full bg-[#14161f] text-slate-500 text-sm rounded-xl px-3.5 py-2.5 border border-[#222533] cursor-not-allowed"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell everyone what your VYBE is all about..."
              className="w-full bg-[#181a24] text-white text-sm rounded-xl p-3 border border-[#2b2f3d] focus:outline-none focus:border-pink-500"
              maxLength={300}
            />
          </div>
        </form>
      </div>
    </div>
  );
};
