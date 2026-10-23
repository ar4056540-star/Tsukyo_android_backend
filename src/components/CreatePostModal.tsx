import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/authContext';
import { createPost, createStory, createReel } from '../lib/dataService';
import { compressImageFile } from '../lib/imageCompressor';
import { uploadAndPublishReel, ReelPublishStage } from '../lib/reelUploadService';
import { uploadMedia } from '../lib/api';
import { X, Image as ImageIcon, Film, Clock, Upload, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface CreatePostModalProps {
  initialType?: 'post' | 'story' | 'reel';
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_MEDIA = {
  post: [
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1080&auto=format&fit=crop&q=80',
  ],
  story: [
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1080&auto=format&fit=crop&q=80',
  ],
  reel: [
    'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-playing-an-acoustic-guitar-42525-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4',
  ],
};

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  initialType = 'post',
  onClose,
  onSuccess,
}) => {
  const { userProfile } = useAuth();
  const [contentType, setContentType] = useState<'post' | 'story' | 'reel'>(initialType);
  const [mediaURL, setMediaURL] = useState(PRESET_MEDIA[initialType][0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [audioTitle, setAudioTitle] = useState('Original Sound — ' + (userProfile?.username || 'VYBE'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStage, setUploadStage] = useState<ReelPublishStage | 'idle'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);

  // Keep track of created Object URLs and abort controllers
  const objectUrlRef = useRef<string | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeUploadIdRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[CreatePostModal] File picker change event triggered', {
      filesCount: e.target.files?.length || 0,
      contentType,
    });

    const file = e.target.files?.[0];
    if (!file) {
      console.warn('[CreatePostModal] File selection cancelled or empty.');
      return;
    }

    console.log('[CreatePostModal] Raw file selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    });

    setVideoLoadError(null);
    setUploadError(null);

    // Handle Image files
    if (file.type.startsWith('image/')) {
      console.log('[CreatePostModal] Processing image file via client compression...');
      try {
        setIsCompressing(true);
        setSelectedFile(file);
        const compressedDataUrl = await compressImageFile(file, {
          maxWidth: contentType === 'story' ? 1080 : 1200,
          maxHeight: contentType === 'story' ? 1920 : 1200,
          quality: 0.82,
          maxSizeBytes: 500 * 1024,
        });
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        setMediaURL(compressedDataUrl);
        console.log('[CreatePostModal] Image compression complete.');
      } catch (err) {
        console.error('[CreatePostModal] Error compressing image:', err);
        alert('Failed to process image. Please try another image.');
      } finally {
        setIsCompressing(false);
      }
    } else if (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|m4v)$/i)) {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const isValid = file instanceof File && file.size > 0;

      console.log('[CreatePostModal] Video file validated:', {
        filename: file.name,
        sizeBytes: file.size,
        sizeMB: `${sizeMB} MB`,
        type: file.type,
        extension: `.${fileExt}`,
        isValidFileObject: isValid,
      });

      // Revoke previous object URL if any
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      // Generate local object URL for instant, zero-latency preview
      const previewUrl = URL.createObjectURL(file);
      objectUrlRef.current = previewUrl;
      setSelectedFile(file);
      setMediaURL(previewUrl);
      console.log('[CreatePostModal] Local preview URL generated successfully:', previewUrl);
    } else {
      console.warn('[CreatePostModal] Unrecognized file MIME type:', file.type);
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setUploadProgress(null);
    setUploadStage('idle');
    setUploadError('Upload was cancelled.');
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    console.log('[CreatePostModal] Submit requested:', {
      contentType,
      hasSelectedFile: !!selectedFile,
      hasMediaURL: !!mediaURL,
      isSubmittingState: isSubmitting,
      isSubmittingRef: isSubmittingRef.current,
      userUid: userProfile?.userId,
      username: userProfile?.username,
    });

    if (isSubmittingRef.current || isSubmitting || !userProfile || !mediaURL) {
      console.warn('[CreatePostModal] Submission suppressed: already submitting or missing profile/media.');
      return;
    }

    const currentUploadId = Date.now();
    activeUploadIdRef.current = currentUploadId;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadStage('uploading');
    setUploadError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const submissionStart = Date.now();
    console.log(`[CreatePostModal] Pipeline dispatch initiated at ${new Date(submissionStart).toISOString()}`);

    try {
      if (contentType === 'reel') {
        if (selectedFile) {
          console.log('[CreatePostModal] Calling uploadAndPublishReel with real progress:', {
            filename: selectedFile.name,
            size: selectedFile.size,
            captionLength: caption.length,
            audioTitle,
          });

          const publishedReel = await uploadAndPublishReel({
            file: selectedFile,
            caption,
            audioTitle,
            ownerProfile: userProfile,
            signal: abortController.signal,
            onProgress: (pct, transferred, total) => {
              // Ignore stale callbacks from aborted/previous uploads
              if (activeUploadIdRef.current !== currentUploadId) return;
              console.log(`[CreatePostModal] Real progress update: ${pct}% (${transferred}/${total} bytes)`);
              setUploadProgress(pct);
            },
            onStageChange: (stage) => {
              if (activeUploadIdRef.current !== currentUploadId) return;
              console.log(`[CreatePostModal] Stage changed: ${stage}`);
              setUploadStage(stage);
            },
          });
          console.log('[CreatePostModal] Reel upload and publish succeeded:', publishedReel);
        } else {
          // Preset media fallback for instant templates
          console.log('[CreatePostModal] Creating Reel from preset template URL:', mediaURL);
          setUploadStage('finalizing');
          const publishedReel = await createReel({
            ownerId: userProfile.userId,
            ownerUsername: userProfile.username,
            ownerDisplayName: userProfile.displayName,
            ownerPhotoURL: userProfile.photoURL,
            caption,
            mediaURL,
            audioTitle,
          });
          console.log('[CreatePostModal] Preset Reel created:', publishedReel);
        }
      } else if (contentType === 'post' || contentType === 'story') {
        let uploadedMediaURL = mediaURL;
        if (selectedFile) {
          setUploadStage('uploading');
          const uploaded = await uploadMedia(selectedFile, contentType === 'post' ? 'posts' : 'stories', (pct) => {
            if (activeUploadIdRef.current === currentUploadId) setUploadProgress(pct);
          });
          uploadedMediaURL = uploaded.url;
          setUploadStage('finalizing');
        }

        if (contentType === 'post') {
          console.log('[CreatePostModal] Creating standard Post record...');
          const publishedPost = await createPost({
            ownerId: userProfile.userId,
            ownerUsername: userProfile.username,
            ownerDisplayName: userProfile.displayName,
            ownerPhotoURL: userProfile.photoURL,
            caption,
            mediaURL: uploadedMediaURL,
            mediaType: 'image',
          });
          console.log('[CreatePostModal] Post created:', publishedPost);
        } else {
          console.log('[CreatePostModal] Creating Story record...');
          const publishedStory = await createStory({
            ownerId: userProfile.userId,
            ownerUsername: userProfile.username,
            ownerDisplayName: userProfile.displayName,
            ownerPhotoURL: userProfile.photoURL,
            caption,
            mediaURL: uploadedMediaURL,
          });
          console.log('[CreatePostModal] Story created:', publishedStory);
        }
      }

      const elapsed = Date.now() - submissionStart;
      console.log(`[CreatePostModal] Submission completed cleanly in ${elapsed}ms. Triggering callbacks.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      if (activeUploadIdRef.current === currentUploadId) {
        console.error('[CreatePostModal] Submission failure:', {
          error: err,
          message: err?.message || String(err),
        });
        setUploadStage('error');
        setUploadError(err?.message || 'Upload failed. Please check your connection and try again.');
      }
    } finally {
      if (activeUploadIdRef.current === currentUploadId) {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 select-none">
      <div className="relative w-full max-w-[480px] h-full bg-[#0b0c0e] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 bg-[#11131a] border-b border-[#20232e] flex items-center justify-between flex-shrink-0">
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-base font-bold text-white">New VYBE</h3>
          <button
            onClick={handleSubmit}
            disabled={!mediaURL || isSubmitting || isCompressing || !!videoLoadError}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-xs font-bold text-white disabled:opacity-40 shadow transition flex items-center space-x-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {uploadStage === 'finalizing'
                    ? 'Finalizing...'
                    : uploadProgress !== null
                    ? `Uploading ${uploadProgress}%`
                    : 'Sharing...'}
                </span>
              </>
            ) : isCompressing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Share</span>
            )}
          </button>
        </div>

        {/* Type Selector (Post / Story / Reel) */}
        <div className="flex border-b border-[#20232e] bg-[#14161f] p-1.5 space-x-1 flex-shrink-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setContentType('post');
              setSelectedFile(null);
              setVideoLoadError(null);
              setUploadError(null);
              setMediaURL(PRESET_MEDIA.post[0]);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
              contentType === 'post' ? 'bg-[#222533] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Post</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setContentType('story');
              setSelectedFile(null);
              setVideoLoadError(null);
              setUploadError(null);
              setMediaURL(PRESET_MEDIA.story[0]);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
              contentType === 'story' ? 'bg-[#222533] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Story</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setContentType('reel');
              setSelectedFile(null);
              setVideoLoadError(null);
              setUploadError(null);
              setMediaURL(PRESET_MEDIA.reel[0]);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
              contentType === 'reel' ? 'bg-[#222533] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Reel</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Media Preview Box */}
          <div className="relative w-full aspect-square bg-[#151722] rounded-2xl overflow-hidden border border-[#2b2f3e] flex items-center justify-center">
            {contentType === 'reel' ? (
              <video
                key={mediaURL}
                src={mediaURL}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                onLoadedMetadata={(e) => {
                  const target = e.currentTarget;
                  setVideoDimensions({ width: target.videoWidth, height: target.videoHeight });
                  setVideoLoadError(null);
                }}
                onError={() => {
                  console.warn('Video preview decode notice: Video format may require H.264/AAC MP4 encoding.');
                  setVideoLoadError('This video codec cannot be decoded in the browser. Please use an MP4 or WebM video.');
                }}
              />
            ) : (
              <img src={mediaURL} alt="Preview" className="w-full h-full object-cover" />
            )}

            {/* Video Dimensions / Aspect Ratio Pill Badge */}
            {contentType === 'reel' && videoDimensions && (
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono z-10">
                {videoDimensions.width}x{videoDimensions.height} (
                {videoDimensions.width > videoDimensions.height
                  ? 'Landscape'
                  : videoDimensions.width < videoDimensions.height
                  ? 'Portrait'
                  : 'Square'}
                )
              </div>
            )}

            {/* Video Load Error Overlay */}
            {videoLoadError && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center space-y-2 z-20">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <p className="text-xs text-slate-200">{videoLoadError}</p>
                <p className="text-[11px] text-slate-400">Supported formats: MP4 (H.264/AAC), WebM (VP8/VP9)</p>
              </div>
            )}

            {/* Image compression in progress */}
            {isCompressing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-2 z-20">
                <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                <p className="text-xs font-semibold text-white">Optimizing photo for feed...</p>
              </div>
            )}

            {/* Real Progress Active Overlay */}
            {isSubmitting && uploadProgress !== null && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 p-6 z-30">
                <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                <p className="text-xs font-bold text-white text-center">
                  {uploadStage === 'finalizing'
                    ? 'Saving Reel to feed...'
                    : `Uploading video... ${uploadProgress}%`}
                </p>
                <div className="w-full max-w-[200px] h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="mt-2 text-[11px] text-slate-400 hover:text-rose-400 transition"
                >
                  Cancel Upload
                </button>
              </div>
            )}

            {/* Upload Failure & Retry Overlay */}
            {uploadError && !isSubmitting && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3 z-30">
                <AlertCircle className="w-8 h-8 text-rose-500" />
                <p className="text-xs font-bold text-white">Upload Failed</p>
                <p className="text-[11px] text-slate-300 max-w-[260px] line-clamp-2">{uploadError}</p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 rounded-full text-xs font-bold text-white flex items-center space-x-1.5 shadow transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Upload</span>
                </button>
              </div>
            )}

            {/* Custom file upload overlay */}
            <label className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full flex items-center space-x-1.5 cursor-pointer hover:bg-black/80 transition z-10 shadow-lg">
              <Upload className="w-3.5 h-3.5" />
              <span>{contentType === 'reel' ? 'Upload Video' : 'Upload Photo'}</span>
              <input
                type="file"
                accept={contentType === 'reel' ? 'video/mp4,video/webm,video/quicktime,video/*' : 'image/*'}
                onChange={handleFileUpload}
                disabled={isCompressing || isSubmitting}
                className="hidden"
              />
            </label>
          </div>

          {/* Aesthetic Presets */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">Or select high-definition aesthetic:</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_MEDIA[contentType].map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (objectUrlRef.current) {
                      URL.revokeObjectURL(objectUrlRef.current);
                      objectUrlRef.current = null;
                    }
                    setSelectedFile(null);
                    setVideoLoadError(null);
                    setUploadError(null);
                    setMediaURL(url);
                  }}
                  className={`aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition ${
                    mediaURL === url && !selectedFile ? 'border-pink-500 scale-95' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {contentType === 'reel' ? (
                    <video src={url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={url} alt="Preset" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Caption Input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Caption & Vibes</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a captivating caption... #vybe #aesthetic"
              rows={3}
              className="w-full bg-[#181a24] text-white text-sm rounded-xl p-3 border border-[#2b2f3d] focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Reel Specific: Audio sound title */}
          {contentType === 'reel' && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Audio Track Name</label>
              <input
                type="text"
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
                placeholder="Song / Sound Title"
                className="w-full bg-[#181a24] text-white text-sm rounded-xl px-3 py-2.5 border border-[#2b2f3d] focus:outline-none focus:border-pink-500"
              />
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
