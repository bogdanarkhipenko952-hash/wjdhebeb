
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { 
  SendHorizontal, ChevronLeft, Sparkles, Paperclip, Image as ImageIcon, Camera, Video, File, X, Wallet, ListChecks, MoreHorizontal, Crop, Scissors, Check, Maximize2, Mic, StopCircle, RotateCcw, Trash2, Plus, Gift
} from 'lucide-react';
import { Contact, Message } from '../types';
import Avatar from './Avatar';

interface ChatWindowProps {
  contact: Contact;
  onBack: () => void;
  initialHistory: Message[];
  onSendMessage: (msg: Message) => void;
  onUpdateMessage?: (msg: Message) => void;
  onViewProfile?: (contact: Contact) => void;
  onOpenGiftMarket?: () => void;
  userBalance?: number;
}

const RECORDING_LIMIT_SEC = 60;

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(2, '0')}`;
};

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  contact, 
  onBack, 
  initialHistory, 
  onSendMessage,
  onUpdateMessage,
  onViewProfile,
  onOpenGiftMarket,
  userBalance = 0
}) => {
  const [messages, setMessages] = useState<Message[]>(initialHistory);
  const [inputValue, setInputValue] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [attachmentTab, setAttachmentTab] = useState<'gallery' | 'file' | 'location' | 'wallet' | 'list'>('gallery');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMessages(initialHistory); }, [initialHistory]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // Camera State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Media Editing State
  const [previewMedia, setPreviewMedia] = useState<{ file: File; url: string; type: 'image' | 'video' } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [cropAspect, setCropAspect] = useState<'original' | 'square'>('original');
  const [videoTrim, setVideoTrim] = useState({ start: 0, end: 100 }); // Percentage
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  // Menu State
  const [menuHeight, setMenuHeight] = useState<'default' | 'full'>('default');
  const dragControls = useDragControls();

  // List State
  const [listTitle, setListTitle] = useState('');
  const [listItems, setListItems] = useState<string[]>(['', '']);
  const [transferAmount, setTransferAmount] = useState('');

  // Recording State
  const [recordingMode, setRecordingMode] = useState<'audio' | 'video'>('audio');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopRequestedRef = useRef(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reaction State
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const handleAddReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === msgId) {
        const reactions = msg.reactions || [];
        const existingReaction = reactions.find(r => r.emoji === emoji);
        let newReactions;
        if (existingReaction) {
          // Toggle reaction off if already reacted by 'me'
          if (existingReaction.users.includes('me')) {
            newReactions = reactions.map(r => r.emoji === emoji ? { ...r, users: r.users.filter(u => u !== 'me') } : r).filter(r => r.users.length > 0);
          } else {
            newReactions = reactions.map(r => r.emoji === emoji ? { ...r, users: [...r.users, 'me'] } : r);
          }
        } else {
          newReactions = [...reactions, { emoji, users: ['me'] }];
        }
        const updatedMsg = { ...msg, reactions: newReactions };
        if (onUpdateMessage) onUpdateMessage(updatedMsg);
        return updatedMsg;
      }
      return msg;
    }));
    setActiveReactionMsgId(null);
  };

  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= RECORDING_LIMIT_SEC) {
            handleStopRecording();
            return prev;
          }
          return prev + 0.1;
        });
      }, 100);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      stopRequestedRef.current = false;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }

      const constraints: MediaStreamConstraints = {
        audio: true,
        video: recordingMode === 'video' ? { 
          facingMode: cameraFacingMode,
          width: { ideal: 480 },
          height: { ideal: 480 },
          aspectRatio: 1 
        } : false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (stopRequestedRef.current) {
        newStream.getTracks().forEach(t => t.stop());
        return;
      }

      setStream(newStream);
      
      const mimeType = recordingMode === 'video' 
        ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm')
        : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm');

      const mediaRecorder = new MediaRecorder(newStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          handleSend(recordingMode === 'video' ? 'video_circle' : 'voice', base64, undefined, { 
            name: recordingMode === 'video' ? 'Video Message' : 'Voice Message', 
            size: formatFileSize(blob.size) 
          });
        };
        reader.readAsDataURL(blob);
        
        // Cleanup tracks
        newStream.getTracks().forEach(t => t.stop());
        setStream(null);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      alert("Не удалось получить доступ к микрофону или камере.");
    }
  };

  const handleStopRecording = () => {
    stopRequestedRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      setStream(null);
    }
  };

  const toggleAudioPlayback = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audio.onended = () => setPlayingAudioId(null);
      audioRef.current = audio;
      audio.play();
      setPlayingAudioId(msgId);
    }
  };

  const toggleCamera = async () => {
    if (!isRecording) {
      setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');
      return;
    }
    
    // If recording, we need to switch stream without losing data
    // This is complex. For now, let's just stop and restart (which creates 2 messages) 
    // OR we can just flip the preview if we were just previewing.
    // But the user asked "without losing recording".
    // A simple hack: Stop current recorder, save chunk, start new recorder with new stream, append to chunks.
    // But MediaRecorder doesn't support appending easily across streams.
    // Let's just implement flipping BEFORE recording for now, or restart stream.
    
    // Actually, let's just flip the state, and if recording, we'd need to replace track.
    const newMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(newMode);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
       // Advanced: Replace video track
       const stream = mediaRecorderRef.current.stream;
       const oldVideoTrack = stream.getVideoTracks()[0];
       if (oldVideoTrack) {
         oldVideoTrack.stop();
         const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newMode, aspectRatio: 1 } });
         const newVideoTrack = newStream.getVideoTracks()[0];
         stream.removeTrack(oldVideoTrack);
         stream.addTrack(newVideoTrack);
         // Note: This might not work in all browsers seamlessly with MediaRecorder
       }
    }
  };

  // Camera Effect
  useEffect(() => {
    let active = true;
    if (showAttachmentMenu && attachmentTab === 'gallery') {
      const startCamera = async () => {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
          });
          if (!active) {
            s.getTracks().forEach(t => t.stop());
            return;
          }
          setStream(s);
          if (videoRef.current) videoRef.current.srcObject = s;
        } catch (err) {
          console.error("Camera error (environment):", err);
          try {
            // Fallback to any camera
            const s = await navigator.mediaDevices.getUserMedia({ video: true });
            if (!active) {
              s.getTracks().forEach(t => t.stop());
              return;
            }
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
          } catch (e) {
            console.error("Final camera error:", e);
          }
        }
      };
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
    }
    return () => {
      active = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [showAttachmentMenu, attachmentTab]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      handleSend('image', dataUrl);
    }
  };

  // Long Press Download Logic
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleLongPressStart = (url: string, filename: string) => {
    longPressTimer.current = setTimeout(() => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleSendList = () => {
    const validItems = listItems.filter(i => i.trim() !== '');
    if (!listTitle.trim() || validItems.length === 0) return;
    
    onSendMessage({
      id: Date.now().toString(),
      role: 'user',
      type: 'list',
      content: listTitle.trim(),
      listItems: validItems.map((text, i) => ({ id: `${Date.now()}-${i}`, text, checked: false })),
      timestamp: new Date(),
      status: 'sent'
    });
    
    setListTitle('');
    setListItems(['', '']);
    setShowAttachmentMenu(false);
  };

  const [customStickers, setCustomStickers] = useState<string[]>([]);
  const stickerInputRef = useRef<HTMLInputElement>(null);

  const handleStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setCustomStickers(prev => [base64, ...prev]);
      };
      reader.readAsDataURL(file);
    }
  };

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const stickers = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=1',
    'https://api.dicebear.com/7.x/bottts/svg?seed=2',
    'https://api.dicebear.com/7.x/bottts/svg?seed=3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=4',
    'https://api.dicebear.com/7.x/bottts/svg?seed=5',
    'https://api.dicebear.com/7.x/bottts/svg?seed=6',
  ];

  // Recording Button Logic
  const recordButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingTriggeredRef = useRef(false);

  const handleRecordButtonDown = () => {
    isRecordingTriggeredRef.current = false;
    recordButtonTimeoutRef.current = setTimeout(() => {
      isRecordingTriggeredRef.current = true;
      handleStartRecording();
    }, 200);
  };

  const handleRecordButtonUp = () => {
    if (recordButtonTimeoutRef.current) {
      clearTimeout(recordButtonTimeoutRef.current);
      recordButtonTimeoutRef.current = null;
    }

    if (isRecordingTriggeredRef.current) {
      handleStopRecording();
      isRecordingTriggeredRef.current = false;
    } else {
      setRecordingMode(prev => prev === 'audio' ? 'video' : 'audio');
    }
  };

  const handleSend = (
    type: Message['type'] = 'text', 
    mediaUrl?: string, 
    listItems?: { id: string; text: string; checked: boolean }[],
    fileInfo?: { name: string; size: string },
    amount?: number,
    currency?: string
  ) => {
    if (type === 'text' && !inputValue.trim()) return;
    
    // Ensure content is never empty for non-text types
    let content = inputValue.trim();
    if (type === 'sticker') content = 'Sticker';
    else if (type === 'transfer') content = `Перевод: ${amount} ${currency}`;
    else if (type === 'voice') content = 'Голосовое сообщение';
    else if (type === 'video_circle') content = 'Видеосообщение';
    else if (fileInfo?.name) content = fileInfo.name;
    else if (type !== 'text') content = 'Media';

    onSendMessage({ 
      id: Date.now().toString(), 
      role: 'user', 
      type, 
      content, 
      mediaUrl,
      listItems,
      fileName: fileInfo?.name,
      fileSize: fileInfo?.size,
      amount,
      currency,
      timestamp: new Date(), 
      status: 'sent' 
    });
    
    if (type === 'text') setInputValue('');
    setShowAttachmentMenu(false);
    setPreviewMedia(null);
    setIsEditing(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Determine type based on file if generic file picker used
    let msgType: Message['type'] = type as Message['type'];
    if (type === 'file') {
        if (file.type.startsWith('image/')) msgType = 'image';
        else if (file.type.startsWith('video/')) msgType = 'video';
        else msgType = 'file';
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (msgType === 'image' || msgType === 'video') {
        setPreviewMedia({ file, url: base64Url, type: msgType });
        setShowAttachmentMenu(false);
      } else {
        handleSend('file', base64Url, undefined, { name: file.name, size: formatFileSize(file.size) });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditedMedia = () => {
    if (!previewMedia) return;

    if (previewMedia.type === 'image' && isEditing && cropAspect === 'square') {
      // Simple square crop simulation using canvas
      const img = new Image();
      img.src = previewMedia.url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw center crop
          ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size);
          const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
          handleSend('image', croppedUrl, undefined, { name: previewMedia.file.name, size: formatFileSize(previewMedia.file.size) });
        }
      };
    } else {
      // Send original if not edited or video (trimming is UI only for now)
      handleSend(previewMedia.type, previewMedia.url, undefined, { name: previewMedia.file.name, size: formatFileSize(previewMedia.file.size) });
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden safe-area-bottom">
      <header className="h-[72px] md:h-20 flex items-center justify-between px-4 border-b border-white/5 shrink-0 bg-black z-[60] shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile?.(contact)}>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onBack(); }} 
            className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
          >
            <ChevronLeft size={24} />
          </motion.button>
          <Avatar src={contact.avatar} name={contact.name} status={contact.status} size="lg" />
          <div className="overflow-hidden">
            <h2 className="font-bold text-[16px] text-white truncate">{contact.name}</h2>
            <div className="flex items-center gap-1.5 overflow-hidden">
              <div className={`w-2 h-2 rounded-full shrink-0 ${contact.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              <span className="text-[12px] font-medium text-zinc-400 truncate">
                {contact.isBot ? 'Бот' : (contact.status === 'online' ? 'В сети' : 'Не в сети')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!contact.isSelf && !contact.isBot && (
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={onOpenGiftMarket}
              className="p-2.5 text-zinc-400 hover:text-indigo-400 bg-white/5 rounded-full transition-colors"
            >
              <Gift size={20} />
            </motion.button>
          )}
          <motion.button 
            whileTap={{ scale: 0.9 }}
            className="p-2.5 text-zinc-400 hover:text-white bg-white/5 rounded-full transition-colors"
          >
            <MoreHorizontal size={20} />
          </motion.button>
        </div>
      </header>

      {/* Messages List */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 relative no-scrollbar"
        onClick={() => setActiveReactionMsgId(null)}
      >
        {messages.length === 0 && !contact.isBot && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Новый чат</h3>
            <p className="text-sm text-zinc-500 mb-6">Отправьте стикер, чтобы начать общение!</p>
            <div className="grid grid-cols-3 gap-3">
              {stickers.slice(0, 3).map((s, i) => (
                <motion.img 
                  key={i}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  src={s} 
                  onClick={() => handleSend('sticker', s)}
                  className="w-16 h-16 cursor-pointer bg-zinc-900 rounded-xl p-2 border border-white/5"
                />
              ))}
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div 
              key={msg.id} 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] flex flex-col relative ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div 
                  className="relative group"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActiveReactionMsgId(msg.id);
                  }}
                >
                  {msg.type === 'sticker' && (
                    <div className="w-32 h-32 hover:scale-105 transition-transform cursor-pointer">
                      <img src={msg.mediaUrl} className="w-full h-full object-contain" alt="Sticker" />
                    </div>
                  )}
                  {msg.type === 'text' && (
                    <div className={`px-4 py-2.5 rounded-[20px] text-[15px] shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-[#1a1a1a] text-zinc-200 rounded-bl-none border border-white/5'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  {msg.type === 'image' && msg.mediaUrl && (
                    <div 
                      onClick={() => setLightboxMedia({ url: msg.mediaUrl!, type: 'image' })}
                      onTouchStart={() => handleLongPressStart(msg.mediaUrl!, `image-${msg.id}.jpg`)}
                      onTouchEnd={handleLongPressEnd}
                      onMouseDown={() => handleLongPressStart(msg.mediaUrl!, `image-${msg.id}.jpg`)}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                      className="rounded-[24px] overflow-hidden shadow-xl border border-white/10 max-w-[240px] cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <img src={msg.mediaUrl || undefined} alt="Sent" className="w-full h-auto object-cover max-h-[300px]" />
                    </div>
                  )}
                  {msg.type === 'video' && msg.mediaUrl && (
                    <div 
                      onClick={() => setLightboxMedia({ url: msg.mediaUrl!, type: 'video' })}
                      onTouchStart={() => handleLongPressStart(msg.mediaUrl!, `video-${msg.id}.mp4`)}
                      onTouchEnd={handleLongPressEnd}
                      onMouseDown={() => handleLongPressStart(msg.mediaUrl!, `video-${msg.id}.mp4`)}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                      className="rounded-[24px] overflow-hidden shadow-xl border border-white/10 max-w-[240px] bg-black cursor-pointer hover:opacity-90 transition-opacity relative group"
                    >
                      <video src={msg.mediaUrl || undefined} className="w-full h-auto max-h-[300px] object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                  {msg.type === 'file' && (
                    <div 
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = msg.mediaUrl!;
                        a.download = msg.fileName || 'file';
                        a.click();
                      }}
                      onTouchStart={() => handleLongPressStart(msg.mediaUrl!, msg.fileName || 'file')}
                      onTouchEnd={handleLongPressEnd}
                      onMouseDown={() => handleLongPressStart(msg.mediaUrl!, msg.fileName || 'file')}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                      className="flex items-center gap-3 p-4 bg-[#1a1a1a] rounded-[24px] border border-white/5 max-w-[280px] cursor-pointer hover:bg-zinc-800 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <File size={24} />
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{msg.content}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{msg.fileSize || 'FILE'}</p>
                      </div>
                    </div>
                  )}
                  {msg.type === 'voice' && msg.mediaUrl && (
                    <div className={`flex items-center gap-3 p-3 rounded-[24px] ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-[#1a1a1a] border border-white/5'}`}>
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleAudioPlayback(msg.id, msg.mediaUrl!)}
                        className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
                      >
                        {playingAudioId === msg.id ? (
                          <div className="flex gap-1">
                            <div className="w-1 h-3 bg-white rounded-full animate-pulse" />
                            <div className="w-1 h-3 bg-white rounded-full animate-pulse delay-75" />
                          </div>
                        ) : (
                          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                        )}
                      </motion.button>
                      <div className="flex-1 h-8 flex items-center gap-1 px-2">
                        {[...Array(15)].map((_, i) => (
                          <motion.div 
                            key={i} 
                            animate={playingAudioId === msg.id ? { height: ['20%', '80%', '20%'] } : { height: '30%' }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                            className="w-1 bg-white/30 rounded-full" 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.type === 'video_circle' && msg.mediaUrl && (
                    <div 
                      onClick={() => setLightboxMedia({ url: msg.mediaUrl!, type: 'video' })}
                      className="w-64 h-64 rounded-full overflow-hidden border-2 border-indigo-500 shadow-2xl bg-black cursor-pointer relative group"
                    >
                      <video src={msg.mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <Maximize2 size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}
                  {msg.type === 'transfer' && (
                    <div className={`p-4 rounded-[24px] min-w-[200px] ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-[#1a1a1a] border border-emerald-500/30 text-emerald-400'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <Wallet size={20} />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Денежный перевод</p>
                          <p className="text-xl font-black font-mono">{msg.amount} {msg.currency}</p>
                        </div>
                      </div>
                      <button className="w-full py-2 bg-white/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/30 transition-colors">
                        Подробнее
                      </button>
                    </div>
                  )}
                  {msg.type === 'list' && msg.listItems && (
                    <div className="bg-zinc-900 rounded-2xl p-4 border border-white/10 w-64">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Список</h4>
                      <div className="space-y-2">
                        {msg.listItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${item.checked ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600'}`}>
                              {item.checked && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                            </div>
                            <span className={`text-sm ${item.checked ? 'text-zinc-500 line-through' : 'text-white'}`}>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reaction Picker */}
                  <AnimatePresence>
                    {activeReactionMsgId === msg.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        className={`absolute top-[-40px] ${msg.role === 'user' ? 'right-0' : 'left-0'} bg-[#1a1a1a] border border-white/10 rounded-full px-3 py-1.5 flex gap-2 shadow-xl z-50`}
                      >
                        {reactionEmojis.map(emoji => (
                          <button 
                            key={emoji}
                            onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, emoji); }}
                            className="text-lg hover:scale-125 transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Reactions Display */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.reactions.map((r, i) => (
                      <button 
                        key={i}
                        onClick={() => handleAddReaction(msg.id, r.emoji)}
                        className={`px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 border ${r.users.includes('me') ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                      >
                        <span>{r.emoji}</span>
                        <span className="font-bold">{r.users.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                  <span className="text-[9px] text-zinc-600 mt-1 px-2 uppercase font-bold tracking-tighter">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-32" />
      </div>

      {/* Island UI Footer - Compact Version */}
      <footer className="shrink-0 p-2 pb-6 bg-black z-50 relative flex items-center gap-2 px-3">
        <AnimatePresence>
          {showAttachmentMenu && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-20 left-4 right-4 bg-[#1a1a1a] rounded-[24px] shadow-2xl z-[70] flex flex-col overflow-hidden border border-white/5 p-1"
            >
              <div className="grid grid-cols-4 gap-1 p-1">
                {[
                  { id: 'gallery', icon: ImageIcon, label: 'Фото', color: 'text-indigo-400' },
                  { id: 'wallet', icon: Wallet, label: 'Деньги', color: 'text-emerald-400' },
                  { id: 'file', icon: File, label: 'Файл', color: 'text-blue-400' },
                  { id: 'list', icon: ListChecks, label: 'Список', color: 'text-amber-400' }
                ].map((tab) => (
                  <motion.button 
                    key={tab.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setAttachmentTab(tab.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-[18px] transition-all ${attachmentTab === tab.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <tab.icon size={20} className={tab.color} />
                    <span className="text-[9px] font-bold uppercase tracking-widest mt-1.5 text-zinc-500">{tab.label}</span>
                  </motion.button>
                ))}
              </div>

              <div className="p-3 border-t border-white/5">
                {attachmentTab === 'gallery' && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-white/5 rounded-[16px] text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors"
                  >
                    Выбрать из галереи
                  </button>
                )}
                {attachmentTab === 'file' && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-white/5 rounded-[16px] text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors"
                  >
                    Выбрать любой файл
                  </button>
                )}
                {attachmentTab === 'wallet' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ваш баланс</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">${userBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-black/50 border border-white/5 rounded-[16px] px-4 py-3">
                      <span className="text-zinc-500 font-bold text-lg">$</span>
                      <input 
                        type="number"
                        value={transferAmount}
                        onChange={e => setTransferAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-transparent text-white outline-none w-full font-mono text-lg"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const amt = parseFloat(transferAmount);
                        if (amt > 0) {
                          if (amt > userBalance) {
                            alert('Недостаточно средств!');
                            return;
                          }
                          handleSend('transfer', undefined, undefined, undefined, amt, 'USD');
                          setTransferAmount('');
                        }
                      }}
                      className="w-full py-3 bg-emerald-600 rounded-[16px] text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20"
                    >
                      Отправить перевод
                    </button>
                  </div>
                )}
                {attachmentTab === 'list' && (
                  <div className="space-y-3">
                    <input 
                      value={listTitle}
                      onChange={e => setListTitle(e.target.value)}
                      placeholder="Название списка..."
                      className="w-full bg-black/50 border border-white/5 rounded-[16px] px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition-all text-white"
                    />
                    <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                      {listItems.map((item, i) => (
                        <div key={i} className="flex gap-2">
                          <input 
                            value={item}
                            onChange={e => {
                              const next = [...listItems];
                              next[i] = e.target.value;
                              setListItems(next);
                            }}
                            placeholder={`Пункт ${i + 1}...`}
                            className="flex-1 bg-white/5 border border-white/5 rounded-[12px] px-3 py-2 text-[11px] outline-none text-white"
                          />
                          {listItems.length > 1 && (
                            <button onClick={() => setListItems(prev => prev.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-red-400 p-1">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setListItems(prev => [...prev, ''])}
                      className="w-full py-2 bg-white/5 rounded-[12px] text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:bg-white/10"
                    >
                      + Добавить пункт
                    </button>
                    <button 
                      onClick={handleSendList}
                      className="w-full py-3 bg-indigo-600 rounded-[16px] text-[10px] font-bold uppercase tracking-widest text-white"
                    >
                      Создать список
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 w-full">
          <div className="flex-1 bg-[#1a1a1a] rounded-[24px] flex items-center gap-2 border border-white/5 shadow-lg relative overflow-hidden transition-all min-h-[48px]">
            {isRecording ? (
              <div className="flex-1 flex items-center px-4 py-2 gap-3 animate-in fade-in duration-200 w-full">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-white font-mono font-bold text-sm min-w-[50px] shrink-0">{formatTime(recordingTime).split(',')[0]}</span>
                <div className="flex-1 min-w-0 text-zinc-500 text-[10px] uppercase tracking-widest text-center truncate">
                  {recordingMode === 'audio' ? 'Запись...' : 'Видео...'}
                </div>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCancelRecording}
                  className="p-2 -mr-2 text-zinc-500 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 size={18} />
                </motion.button>
              </div>
            ) : (
              <>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ml-1 ${showAttachmentMenu ? 'text-indigo-500 rotate-45' : 'text-zinc-400 hover:text-white'}`}
                >
                  <Plus size={22} />
                </motion.button>

                <input 
                  value={inputValue} 
                  onChange={e => setInputValue(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSend('text')}
                  placeholder="Сообщение..."
                  className="flex-1 bg-transparent text-[15px] outline-none text-white py-3 min-w-0 placeholder:text-zinc-600" 
                />

                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors mr-1 ${showEmojiPicker ? 'text-indigo-500' : 'text-zinc-400 hover:text-white'}`}
                >
                  <Sparkles size={20} />
                </motion.button>

                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute bottom-full right-0 mb-4 p-3 bg-[#1a1a1a] border border-white/5 rounded-[20px] shadow-2xl w-64 z-50"
                    >
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto no-scrollbar">
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => stickerInputRef.current?.click()}
                          className="w-12 h-12 rounded-xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-zinc-500 hover:text-white"
                        >
                          <Plus size={20} />
                        </motion.button>
                        {customStickers.map((s, i) => (
                          <img key={`custom-${i}`} src={s} onClick={() => { handleSend('sticker', s); setShowEmojiPicker(false); }} className="w-12 h-12 cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-colors object-contain" />
                        ))}
                        {stickers.map((s, i) => (
                          <img key={i} src={s} onClick={() => { handleSend('sticker', s); setShowEmojiPicker(false); }} className="w-12 h-12 cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-colors" />
                        ))}
                      </div>
                      <input type="file" ref={stickerInputRef} onChange={handleStickerUpload} accept="image/*" hidden />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
          
          <div className="shrink-0">
            {inputValue.trim() || isRecording ? (
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={isRecording ? handleStopRecording : () => handleSend('text')}
                className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"
              >
                <SendHorizontal size={22} />
              </motion.button>
            ) : (
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onMouseDown={handleRecordButtonDown}
                onMouseUp={handleRecordButtonUp}
                onTouchStart={handleRecordButtonDown}
                onTouchEnd={handleRecordButtonUp}
                className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center text-zinc-400 hover:text-white border border-white/5 shadow-lg select-none touch-none"
              >
                {recordingMode === 'audio' ? <Mic size={22} /> : <Camera size={22} />}
              </motion.button>
            )}
          </div>
        </div>

        <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e, 'file')} accept="*/*" multiple hidden />
      </footer>
      
      {/* Video Circle Preview Overlay */}
      <AnimatePresence>
        {isRecording && recordingMode === 'video' && (
          <motion.div 
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 50 }}
            className="fixed bottom-24 right-4 w-56 h-56 rounded-full overflow-hidden border-4 border-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.5)] z-[100] bg-black"
          >
            <video 
              ref={v => {
                if (v && stream) {
                  v.srcObject = stream;
                }
              }}
              autoPlay 
              muted 
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: cameraFacingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatWindow;
