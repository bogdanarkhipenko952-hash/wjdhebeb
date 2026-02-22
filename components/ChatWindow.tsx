
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { 
  SendHorizontal, ChevronLeft, Sparkles, Paperclip, Image as ImageIcon, Camera, Video, File, X, Wallet, ListChecks, MoreHorizontal, Crop, Scissors, Check, Maximize2, Mic, StopCircle, RotateCcw, Trash2
} from 'lucide-react';
import { Contact, Message } from '../types';
import Avatar from './Avatar';

interface ChatWindowProps {
  contact: Contact;
  onBack: () => void;
  initialHistory: Message[];
  onSendMessage: (msg: Message) => void;
  onViewProfile?: (contact: Contact) => void;
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
  onViewProfile
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
  const [listItems, setListItems] = useState(['', '']);

  useEffect(() => {
    // Simulate loading recent gallery images (in a real app this would need native permissions)
    // For web, we can't auto-read gallery, so we'll show a "Select from Gallery" button prominently
  }, []);

  // Recording State
  const [recordingMode, setRecordingMode] = useState<'audio' | 'video'>('audio');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');

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
      // Stop preview stream if active to prevent resource locking
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }

      const newStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: recordingMode === 'video' ? { facingMode: cameraFacingMode, aspectRatio: 1 } : false 
      });
      
      setStream(newStream); // Set stream for preview
      
      const mediaRecorder = new MediaRecorder(newStream);
      mediaRecorderRef.current = mediaRecorder;
      
      if (recordingMode === 'audio') {
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            handleSend('voice', base64, undefined, { name: 'Voice Message', size: formatFileSize(blob.size) });
          };
          reader.readAsDataURL(blob);
          newStream.getTracks().forEach(t => t.stop());
        };
      } else {
        videoChunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => videoChunksRef.current.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            handleSend('video_circle', base64, undefined, { name: 'Video Message', size: formatFileSize(blob.size) });
          };
          reader.readAsDataURL(blob);
          newStream.getTracks().forEach(t => t.stop());
        };
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      alert("Не удалось получить доступ к микрофону или камере.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStream(null);
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // Prevent onstop from sending
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      setStream(null);
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

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const stickers = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=1',
    'https://api.dicebear.com/7.x/bottts/svg?seed=2',
    'https://api.dicebear.com/7.x/bottts/svg?seed=3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=4',
    'https://api.dicebear.com/7.x/bottts/svg?seed=5',
    'https://api.dicebear.com/7.x/bottts/svg?seed=6',
  ];

  const handleSend = (
    type: Message['type'] = 'text', 
    mediaUrl?: string, 
    listItems?: { id: string; text: string; checked: boolean }[],
    fileInfo?: { name: string; size: string }
  ) => {
    if (type === 'text' && !inputValue.trim()) return;
    
    onSendMessage({ 
      id: Date.now().toString(), 
      role: 'user', 
      type, 
      content: type === 'text' ? inputValue.trim() : fileInfo?.name, 
      mediaUrl,
      listItems,
      fileName: fileInfo?.name,
      fileSize: fileInfo?.size,
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
    <div className="flex flex-col h-full bg-[#181818] relative overflow-hidden safe-area-bottom">
      <header className="h-[72px] md:h-20 flex items-center justify-between px-4 border-b border-white/5 shrink-0 bg-[#181818]/80 backdrop-blur-xl z-[60]">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile?.(contact)}>
          <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="md:hidden p-2 -ml-2 text-zinc-400"><ChevronLeft size={24} /></button>
          <Avatar src={contact.avatar} name={contact.name} status={contact.status} size="lg" />
          <div className="overflow-hidden">
            <h2 className="font-bold text-[15px] text-white truncate italic">{contact.name}</h2>
            <div className="flex items-center gap-1.5 overflow-hidden">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${contact.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'}`} />
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 truncate">
                {contact.isBot ? 'Бот' : (contact.status === 'online' ? 'Online' : 'Offline')}
              </span>
            </div>
          </div>
        </div>
        {/* Sparkles button removed as per request */}
      </header>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative transition-all duration-300">
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
              <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.type === 'sticker' && (
                    <div className="w-32 h-32">
                      <img src={msg.content} className="w-full h-full object-contain" alt="Sticker" />
                    </div>
                  )}
                  {msg.type === 'text' && (
                    <div className={`px-4 py-2.5 rounded-[1.5rem] text-sm shadow-md ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-zinc-900 text-zinc-100 rounded-tl-none border border-white/5'
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
                      className="rounded-2xl overflow-hidden shadow-xl border border-white/10 max-w-[200px] cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <img src={msg.mediaUrl || undefined} alt="Sent" className="w-full h-auto object-cover max-h-[200px]" />
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
                      className="rounded-2xl overflow-hidden shadow-xl border border-white/10 max-w-[200px] bg-black cursor-pointer hover:opacity-90 transition-opacity relative group"
                    >
                      <video src={msg.mediaUrl || undefined} className="w-full h-auto max-h-[200px] object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
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
                      className="flex items-center gap-3 p-3 bg-zinc-900 rounded-2xl border border-white/10 max-w-[280px] cursor-pointer hover:bg-zinc-800 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <File size={20} />
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{msg.content}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{msg.fileSize || 'FILE'}</p>
                      </div>
                    </div>
                  )}
                  {msg.type === 'voice' && msg.mediaUrl && (
                    <div className={`flex items-center gap-3 p-3 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-zinc-900 border border-white/5'}`}>
                      <button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                      </button>
                      <div className="flex-1 h-8 flex items-center gap-1">
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className="w-1 bg-white/30 rounded-full" style={{ height: `${20 + Math.random() * 60}%` }} />
                        ))}
                      </div>
                      <audio src={msg.mediaUrl} className="hidden" />
                    </div>
                  )}
                  {msg.type === 'video_circle' && msg.mediaUrl && (
                    <div 
                      onClick={() => setLightboxMedia({ url: msg.mediaUrl!, type: 'video' })}
                      className="w-64 h-64 rounded-full overflow-hidden border-4 border-indigo-500 shadow-2xl bg-black cursor-pointer relative group"
                    >
                      <video src={msg.mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <Maximize2 size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
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
                  <span className="text-[9px] text-zinc-600 mt-1 px-2 uppercase font-bold tracking-tighter">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-32" />
      </div>

      {/* Input Bar */}
      <footer className="shrink-0 p-4 pb-4 bg-gradient-to-t from-[#181818] to-transparent z-50 relative">
        <AnimatePresence>
          {showAttachmentMenu && (
            <motion.div 
              drag="y"
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 150) {
                  setShowAttachmentMenu(false);
                } else if (info.offset.y < -50) {
                  setMenuHeight('full');
                } else if (menuHeight === 'full' && info.offset.y > 50) {
                  setMenuHeight('default');
                }
              }}
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0, height: menuHeight === 'full' ? '100%' : '60%' }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-[#1c1c1e] rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] z-[70] flex flex-col overflow-hidden"
            >
              {/* Handle */}
              <div 
                onPointerDown={(e) => dragControls.start(e)}
                className="w-full flex items-center justify-between px-6 py-4 cursor-grab active:cursor-grabbing touch-none shrink-0"
              >
                <button 
                  onClick={() => setShowAttachmentMenu(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="w-12 h-1.5 bg-zinc-600/50 rounded-full" />
                <div className="w-5" /> {/* Spacer */}
              </div>

              <div className="flex-1 overflow-y-auto px-1 pb-24">
                {attachmentTab === 'gallery' && (
                  <div className="flex flex-col items-center justify-center h-[300px] p-6">
                    <button 
                      onClick={() => {
                         if (fileInputRef.current) {
                           fileInputRef.current.removeAttribute('capture');
                           fileInputRef.current.accept = "image/*,video/*";
                           fileInputRef.current.click();
                         }
                      }}
                      className="w-full h-full bg-zinc-800/50 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border-2 border-dashed border-zinc-700 hover:border-zinc-500 group"
                    >
                      <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon size={40} className="text-indigo-500" />
                      </div>
                      <div className="text-center">
                        <span className="text-lg font-bold block">Выбрать из галереи</span>
                        <span className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Фото или Видео</span>
                      </div>
                    </button>
                  </div>
                )}

                {attachmentTab === 'file' && (
                  <div className="p-6 space-y-4">
                    <button 
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.removeAttribute('capture');
                          fileInputRef.current.accept = "*/*";
                          fileInputRef.current.click();
                        }
                      }} 
                      className="w-full p-4 rounded-2xl bg-white/5 flex items-center gap-4 hover:bg-white/10 transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <File size={24} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">Выбрать файл</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Любой формат</p>
                      </div>
                    </button>
                  </div>
                )}
                
                {attachmentTab === 'list' && (
                  <div className="p-6 space-y-4">
                    <input 
                      value={listTitle}
                      onChange={e => setListTitle(e.target.value)}
                      placeholder="Название списка..."
                      className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 outline-none transition-all text-white"
                    />
                    <div className="space-y-2">
                      {listItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded border border-zinc-700 flex-shrink-0" />
                          <input 
                            value={item}
                            onChange={e => {
                              const newItems = [...listItems];
                              newItems[index] = e.target.value;
                              setListItems(newItems);
                            }}
                            placeholder={`Пункт ${index + 1}`}
                            className="flex-1 bg-transparent border-b border-zinc-800 py-2 text-sm text-white outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setListItems([...listItems, ''])}
                      className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 py-2"
                    >
                      + Добавить пункт
                    </button>
                    <button 
                      onClick={handleSendList}
                      disabled={!listTitle.trim() || listItems.filter(i => i.trim() !== '').length === 0}
                      className="w-full py-4 mt-4 bg-indigo-600 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
                    >
                      Отправить список
                    </button>
                  </div>
                )}

                {attachmentTab === 'wallet' && (
                  <div className="p-10 text-center">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 mx-auto mb-4">
                      <Wallet size={32} />
                    </div>
                    <p className="text-sm font-bold text-white">Кошелёк Pulse</p>
                    <p className="text-xs text-zinc-500 mt-2">Отправляйте активы мгновенно</p>
                  </div>
                )}
              </div>

              {/* Bottom Navigation - Floating Island Style */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[100] w-[320px]">
                <div className="liquid-glass h-[64px] rounded-[2rem] px-1.5 flex items-center justify-around relative shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                  <div 
                    className="absolute h-[52px] w-[56px] bg-white/10 border border-white/10 rounded-[1.6rem] z-0 shadow-xl"
                    style={{ 
                      left: `calc(${['gallery', 'wallet', 'file', 'list'].indexOf(attachmentTab)} * 25% + 12.5% - 28px)`,
                      transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                  />
                  
                  {[
                    { id: 'gallery', icon: ImageIcon, label: 'Галерея' },
                    { id: 'wallet', icon: Wallet, label: 'Кошелёк' },
                    { id: 'file', icon: File, label: 'Файл' },
                    { id: 'list', icon: ListChecks, label: 'Список' }
                  ].map((tab) => (
                    <button 
                      key={tab.id}
                      onPointerDown={() => setAttachmentTab(tab.id as any)}
                      className={`relative z-10 flex flex-col items-center justify-center w-full h-full active:scale-90 transition-transform duration-100 ${attachmentTab === tab.id ? 'scale-110 text-white' : 'opacity-40 hover:opacity-70 text-zinc-300'}`}
                    >
                      <tab.icon size={20} strokeWidth={2.5} />
                    </button>
                  ))}
                </div>
              </div>

              <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e, 'file')} accept="*/*" multiple hidden />
              <input type="file" ref={videoInputRef} onChange={(e) => handleFileSelect(e, 'video')} accept="video/*" hidden />
              <canvas ref={canvasRef} className="hidden" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media Preview & Edit Overlay */}
        <AnimatePresence>
          {previewMedia && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[80] bg-black flex flex-col"
            >
              <div className="flex justify-between items-center p-4">
                <button onClick={() => setPreviewMedia(null)} className="p-2 text-white"><X size={24} /></button>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                  {isEditing ? 'Редактирование' : 'Предпросмотр'}
                </h3>
                <button 
                  onClick={() => setIsEditing(!isEditing)} 
                  className={`p-2 transition-colors ${isEditing ? 'text-indigo-400' : 'text-zinc-400'}`}
                >
                  {previewMedia.type === 'image' ? <Crop size={24} /> : <Scissors size={24} />}
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center bg-zinc-900 overflow-hidden relative">
                {previewMedia.type === 'image' ? (
                  <img 
                    src={previewMedia.url || undefined} 
                    alt="Preview" 
                    className={`max-w-full max-h-full object-contain transition-all duration-300 ${isEditing && cropAspect === 'square' ? 'object-cover aspect-square w-full' : ''}`} 
                  />
                ) : (
                  <video src={previewMedia.url || undefined} controls className="max-w-full max-h-full" />
                )}
                
                {/* Simple Crop Overlay UI */}
                {isEditing && previewMedia.type === 'image' && (
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
                    <button 
                      onClick={() => setCropAspect('original')}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border ${cropAspect === 'original' ? 'bg-white text-black border-white' : 'bg-black/50 text-white border-white/20'}`}
                    >
                      Оригинал
                    </button>
                    <button 
                      onClick={() => setCropAspect('square')}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border ${cropAspect === 'square' ? 'bg-white text-black border-white' : 'bg-black/50 text-white border-white/20'}`}
                    >
                      Квадрат 1:1
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 bg-black/80 backdrop-blur-xl border-t border-white/10 flex justify-end">
                <button 
                  onClick={handleSaveEditedMedia}
                  className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
                >
                  <SendHorizontal size={24} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lightbox Overlay */}
        <AnimatePresence>
          {isRecording && recordingMode === 'video' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <div className="w-72 h-72 rounded-full border-4 border-indigo-500 overflow-hidden bg-black shadow-2xl relative">
                <video 
                  autoPlay 
                  muted 
                  playsInline 
                  ref={(el) => {
                    if (el && stream) el.srcObject = stream;
                  }}
                  className="w-full h-full object-cover scale-x-[-1]" 
                />
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold animate-pulse flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-white" />
                  {formatTime(recordingTime)}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {lightboxMedia && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-xl flex items-center justify-center"
              onClick={() => setLightboxMedia(null)}
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxMedia(null);
                }}
                className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-[100]"
              >
                <X size={24} />
              </button>
              {lightboxMedia.type === 'image' ? (
                <img src={lightboxMedia.url || undefined} alt="Full" className="max-w-full max-h-full object-contain" />
              ) : (
                <video src={lightboxMedia.url || undefined} controls autoPlay className="max-w-full max-h-full" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`p-1.5 pl-4 rounded-[2.5rem] flex items-center gap-3 liquid-glass border border-white/5 shadow-2xl transition-all relative ${isRecording ? 'bg-red-500/10 border-red-500/30' : ''}`}>
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-full left-0 mb-4 p-4 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl w-72 z-50"
              >
                <div className="grid grid-cols-4 gap-2">
                  {stickers.map((s, i) => (
                    <img 
                      key={i} 
                      src={s} 
                      onClick={() => { handleSend('sticker', s); setShowEmojiPicker(false); }}
                      className="w-12 h-12 cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-colors" 
                    />
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-6 gap-2">
                  {['😊', '😂', '🔥', '❤️', '👍', '🚀'].map(e => (
                    <button 
                      key={e} 
                      onClick={() => { setInputValue(prev => prev + e); setShowEmojiPicker(false); }}
                      className="text-xl hover:bg-white/5 p-1 rounded-lg transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <Sparkles size={22} />
          </button>
          <button 
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className={`p-2 transition-colors ${showAttachmentMenu ? 'text-indigo-400' : 'text-zinc-500 hover:text-white'}`}
          >
            <Paperclip size={22} />
          </button>
          <input 
            value={inputValue} 
            onChange={e => setInputValue(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSend('text')}
            placeholder={isRecording ? (recordingMode === 'audio' ? 'Запись голоса...' : 'Запись видео...') : "Cообщение..."}
            disabled={isRecording}
            className="flex-1 bg-transparent text-[15px] outline-none text-white py-3 min-w-0 disabled:opacity-50" 
          />
          
          {inputValue.trim() ? (
            <button 
              onClick={() => handleSend('text')}
              className="w-11 h-11 rounded-full flex items-center justify-center mr-1 text-white shadow-lg active:scale-95 transition-all bg-indigo-600"
            >
              <SendHorizontal size={20} />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {isRecording ? (
                <div className="flex items-center gap-4 pr-2">
                   <div className="text-red-500 font-mono text-sm font-bold animate-pulse">
                     {formatTime(recordingTime)}
                   </div>
                   <button 
                     onClick={handleCancelRecording}
                     className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                   >
                     <Trash2 size={20} />
                   </button>
                   {recordingMode === 'video' && (
                     <button 
                       onClick={toggleCamera}
                       className="p-2 text-zinc-400 hover:text-white transition-colors"
                     >
                       <RotateCcw size={20} />
                     </button>
                   )}
                   <button 
                     onClick={handleStopRecording}
                     className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white animate-pulse"
                   >
                     <StopCircle size={20} fill="currentColor" />
                   </button>
                </div>
              ) : (
                <button 
                  onMouseDown={handleStartRecording}
                  onMouseUp={handleStopRecording}
                  onTouchStart={handleStartRecording}
                  onTouchEnd={handleStopRecording}
                  className="w-11 h-11 rounded-full flex items-center justify-center mr-1 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                >
                  {recordingMode === 'audio' ? (
                    <Mic size={24} onClick={() => setRecordingMode('video')} />
                  ) : (
                    <Camera size={24} onClick={() => setRecordingMode('audio')} />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
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
                if (v && mediaRecorderRef.current?.stream) {
                  v.srcObject = mediaRecorderRef.current.stream;
                }
              }}
              autoPlay 
              muted 
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
