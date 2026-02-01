
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id, Doc } from '../convex/_generated/dataModel';
import AudioPlayer from '../components/AudioPlayer';
import CryptoJS from 'crypto-js';

interface UploadWizardProps {
  recipients: Doc<"recipients">[];
  userId: Id<"users">;
}

interface FileEntry {
  id: string;
  type: 'pdf' | 'note' | 'image' | 'audio';
  name: string;
  size: string;
  blob?: Blob;
  url?: string;
  noteContent?: string;
}

const UploadWizard: React.FC<UploadWizardProps> = ({ recipients, userId }) => {
  const navigate = useNavigate();
  const addFileMutation = useMutation(api.files.add);
  const generateUploadUrl = useAction(api.fileStorage.generateUploadUrl);
  const deriveEncryptionKey = useAction(api.auth.deriveEncryptionKeyAction);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedFiles, setSelectedFiles] = useState<FileEntry[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  // Multi-file state tracking
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioMode, setAudioMode] = useState<'upload' | 'record'>('upload');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentTypeRef = useRef<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);

  // Load encryption key on mount
  useEffect(() => {
    // Check sessionStorage first (current session), then localStorage (multi-device support)
    let stored = sessionStorage.getItem('guardian_encryption_key');
    if (!stored) {
      stored = localStorage.getItem('guardian_encryption_key');
    }
    if (stored) {
      setEncryptionKey(stored);
      // If we loaded from localStorage, also set in sessionStorage for consistency
      if (!sessionStorage.getItem('guardian_encryption_key')) {
        sessionStorage.setItem('guardian_encryption_key', stored);
      }
    }
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'pdf': return 'picture_as_pdf';
      case 'note': return 'history_edu';
      case 'image': return 'image';
      case 'audio': return 'mic';
      default: return 'insert_drive_file';
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'pdf': return 'Document';
      case 'note': return 'Message';
      case 'image': return 'Photo';
      case 'audio': return 'Audio';
      default: return 'File';
    }
  };

  const toggleType = (type: string) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const size = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

      const newFile: FileEntry = {
        id: Math.random().toString(),
        type: fileType as any,
        name: file.name.split('.')[0],
        size: size,
        blob: file,
        url: URL.createObjectURL(file)
      };

      setSelectedFiles(prev => [...prev, newFile]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      console.log("[RECORD] Starting audio recording...");
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support audio recording. Please use Chrome, Firefox, Safari, or Edge.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[RECORD] Microphone stream obtained successfully");
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const size = audioBlob.size > 1024 * 1024
          ? `${(audioBlob.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(audioBlob.size / 1024).toFixed(0)} KB`;

        console.log(`[RECORD] Recording stopped. Size: ${size}`);

        const newFile: FileEntry = {
          id: Math.random().toString(),
          type: 'audio',
          name: `Recording ${new Date().toLocaleTimeString()}`,
          size: size,
          blob: audioBlob,
          url: audioUrl
        };

        setSelectedFiles(prev => [...prev, newFile]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log("[RECORD] Recording started successfully");
    } catch (err: any) {
      console.error("[RECORD] Error:", err);
      let errorMsg = "Could not access microphone. Please check permissions.";
      
      if (err.name === "NotAllowedError") {
        errorMsg = "Microphone permission denied. Please allow access in your browser settings.";
      } else if (err.name === "NotFoundError") {
        errorMsg = "No microphone found. Please connect a microphone.";
      } else if (err.name === "NotReadableError") {
        errorMsg = "Microphone is being used by another application. Please close other apps using the mic.";
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const stopRecording = () => {
    console.log("[RECORD] Stopping recording...");
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      console.log("[RECORD] Recording stopped");
    } else {
      console.warn("[RECORD] No recording in progress");
    }
  };

  const handleDraftWithAI = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Write a short, heart-felt final legacy message. Keep it under 60 words. No subject lines.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      const newFile: FileEntry = {
        id: Math.random().toString(),
        type: 'note',
        name: 'My Message',
        size: `${(new Blob([response.text || '']).size / 1024).toFixed(1)} KB`,
        noteContent: response.text || ''
      };
      setSelectedFiles(prev => [...prev, newFile]);
    } catch (err) {
      setErrorMessage("AI is not available right now. Please write your message manually.");
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  const addNote = (content: string) => {
    if (!content.trim()) return;
    const newFile: FileEntry = {
      id: Math.random().toString(),
      type: 'note',
      name: 'My Message',
      size: `${(new Blob([content]).size / 1024).toFixed(1)} KB`,
      noteContent: content
    };
    setSelectedFiles(prev => [...prev, newFile]);
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const finalize = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    const failedFiles: string[] = [];
    let successCount = 0;

    try {
      // Recipients are now optional - users can save items to vault without assigning recipients

      console.log(`[FINALIZE] Starting save for ${selectedFiles.length} file(s) to ${selectedRecipientIds.length} recipient(s)`, {
        recipientIds: selectedRecipientIds,
        fileNames: selectedFiles.map(f => f.name)
      });
      for (const file of selectedFiles) {
        const finalSize = file.type === 'note'
          ? `${(new Blob([file.noteContent || '']).size / 1024).toFixed(1)} KB`
          : file.size;

        let audioStorageId: string | undefined = undefined;
        let imageStorageId: string | undefined = undefined;
        let documentStorageId: string | undefined = undefined;
        let encryptedContent: string | undefined = undefined;
        let uploadFailed = false;

        // If it's an audio file, upload it to storage first
        // Using client-side upload pattern: generate URL -> upload from browser -> get storageId
        if (file.type === 'audio' && file.blob) {
          try {
            console.log(`[UPLOAD] Starting audio upload for: ${file.name}, size: ${file.blob.size} bytes`);

            // Step 1: Get a short-lived upload URL from Convex
            const uploadUrl = await generateUploadUrl();
            console.log(`[UPLOAD] Got upload URL for audio`);

            // Step 2: Upload the blob directly from the browser to the upload URL
            const response = await fetch(uploadUrl, {
              method: "POST",
              headers: {
                "Content-Type": file.blob.type || "audio/webm",
              },
              body: file.blob,
            });

            console.log(`[UPLOAD] Audio upload response status: ${response.status}`);

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[UPLOAD] Audio upload failed: ${response.status} - ${errorText}`);
              throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
            }

            // Step 3: Get the storageId from the response
            const responseText = await response.text();
            console.log(`[UPLOAD] Audio upload response body: ${responseText}`);

            const result = JSON.parse(responseText) as { storageId: string };
            if (!result.storageId) {
              console.error(`[UPLOAD] No storageId in response:`, result);
              throw new Error('No storageId returned from upload');
            }

            audioStorageId = result.storageId;
            console.log(`[UPLOAD] Audio file uploaded successfully. StorageId: ${audioStorageId}`);
          } catch (audioError) {
            console.error("[UPLOAD] Failed to upload audio file:", audioError);
            uploadFailed = true;
            failedFiles.push(file.name);
          }
        }

        // If it's an image file, upload it to storage
        if (file.type === 'image' && file.blob) {
          try {
            console.log(`[UPLOAD] Starting image upload for: ${file.name}, size: ${file.blob.size} bytes`);

            // Step 1: Get a short-lived upload URL from Convex
            const uploadUrl = await generateUploadUrl();
            console.log(`[UPLOAD] Got upload URL for image`);

            // Step 2: Upload the blob directly from the browser to the upload URL
            const response = await fetch(uploadUrl, {
              method: "POST",
              headers: {
                "Content-Type": file.blob.type || "image/jpeg",
              },
              body: file.blob,
            });

            console.log(`[UPLOAD] Image upload response status: ${response.status}`);

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[UPLOAD] Image upload failed: ${response.status} - ${errorText}`);
              throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
            }

            // Step 3: Get the storageId from the response
            const responseText = await response.text();
            console.log(`[UPLOAD] Image upload response body: ${responseText}`);

            const result = JSON.parse(responseText) as { storageId: string };
            if (!result.storageId) {
              console.error(`[UPLOAD] No storageId in response:`, result);
              throw new Error('No storageId returned from upload');
            }

            imageStorageId = result.storageId;
            console.log(`[UPLOAD] Image file uploaded successfully. StorageId: ${imageStorageId}`);
          } catch (imageError) {
            console.error("[UPLOAD] Failed to upload image file:", imageError);
            uploadFailed = true;
            failedFiles.push(file.name);
          }
        }

        // Handle PDF and document files - upload to storage
        // Note: 'pdf' is the actual type used by the FileEntry interface
        // 'document' type is not currently in use but kept for future compatibility
        if ((file.type === 'pdf' || file.type === 'document') && file.blob) {
          try {
            console.log(`[UPLOAD] Starting document/PDF upload for: ${file.name}, type: ${file.type}, size: ${file.blob.size} bytes`);

            // Step 1: Get a short-lived upload URL from Convex
            const uploadUrl = await generateUploadUrl();
            console.log(`[UPLOAD] Got upload URL for document/PDF`);

            // Step 2: Upload the blob directly from the browser to the upload URL
            const response = await fetch(uploadUrl, {
              method: "POST",
              headers: {
                "Content-Type": file.blob.type || "application/pdf",
              },
              body: file.blob,
            });

            console.log(`[UPLOAD] Document/PDF upload response status: ${response.status}`);

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[UPLOAD] Document/PDF upload failed: ${response.status} - ${errorText}`);
              throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
            }

            // Step 3: Get the storageId from the response
            const responseText = await response.text();
            console.log(`[UPLOAD] Document/PDF upload response body: ${responseText}`);

            const result = JSON.parse(responseText) as { storageId: string };
            if (!result.storageId) {
              console.error(`[UPLOAD] No storageId in response:`, result);
              throw new Error('No storageId returned from upload');
            }

            documentStorageId = result.storageId;
            console.log(`[UPLOAD] Document/PDF file uploaded successfully. StorageId: ${documentStorageId}`);
          } catch (docError) {
            console.error("[UPLOAD] Failed to upload document/PDF file:", docError);
            uploadFailed = true;
            failedFiles.push(file.name);
          }
        }

        // Skip saving this file if the upload failed (for non-note files that require storage)
        if (uploadFailed && file.type !== 'note') {
          console.warn(`[FINALIZE] Skipping save for ${file.name} due to upload failure`);
          continue;
        }

        // For note files, always store plaintext for emails
        let plaintextContent: string | undefined = undefined;
        let isActuallyEncrypted = false;

        if (file.type === 'note' && file.noteContent) {
          plaintextContent = file.noteContent;

          // Encrypt note content if encryption key is available
          if (encryptionKey) {
            try {
              encryptedContent = CryptoJS.AES.encrypt(file.noteContent, encryptionKey).toString();
              isActuallyEncrypted = true;
              console.log(`[ENCRYPT] Note encrypted successfully`);
            } catch (encryptError) {
              console.error("[ENCRYPT] Failed to encrypt note:", encryptError);
              encryptedContent = file.noteContent;
              isActuallyEncrypted = false;
            }
          } else {
            // No encryption key available, store plaintext as content
            encryptedContent = file.noteContent;
            isActuallyEncrypted = false;
          }
        }

        // Save to database
        const filePayload = {
          userId,
          name: file.name,
          size: finalSize,
          type: file.type,
          content: encryptedContent || file.noteContent,
          plaintext: plaintextContent, // Store unencrypted plaintext for emails
          audioStorageId: audioStorageId as any,
          imageStorageId: imageStorageId as any,
          documentStorageId: documentStorageId as any,
          recipientIds: selectedRecipientIds.map(id => typeof id === 'string' ? id : id.toString()),
          addedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          isEncrypted: isActuallyEncrypted,
        };

        console.log(`[FINALIZE] ========== SAVING FILE TO DATABASE ==========`);
        console.log(`[FINALIZE] File name: ${file.name}`);
        console.log(`[FINALIZE] File type: ${file.type}`);
        console.log(`[FINALIZE] Storage IDs being saved:`);
        console.log(`[FINALIZE]   - audioStorageId: ${audioStorageId || 'NOT SET'}`);
        console.log(`[FINALIZE]   - imageStorageId: ${imageStorageId || 'NOT SET'}`);
        console.log(`[FINALIZE]   - documentStorageId: ${documentStorageId || 'NOT SET'}`);
        console.log(`[FINALIZE] Recipients: ${filePayload.recipientIds.length} (${filePayload.recipientIds.join(', ')})`);
        console.log(`[FINALIZE] Full payload:`, JSON.stringify(filePayload, null, 2));

        const savedFileId = await addFileMutation(filePayload);
        console.log(`[FINALIZE] File saved successfully with ID: ${savedFileId}`);
        console.log(`[FINALIZE] ========================================`);
        successCount++;
      }

      // Only navigate if at least one file was saved successfully
      if (successCount > 0) {
        if (failedFiles.length > 0) {
          // Show brief error before navigating
          setErrorMessage(`${successCount} item(s) saved. Failed to upload: ${failedFiles.join(', ')}`);
          setTimeout(() => navigate('/vault'), 2000);
        } else {
          navigate('/vault');
        }
      } else if (failedFiles.length > 0) {
        setErrorMessage(`Failed to upload: ${failedFiles.join(', ')}. Please try again.`);
      }
    } catch (err) {
      console.error("[FINALIZE] Error saving files:", err);
      setErrorMessage("Failed to save files. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = selectedFiles.length > 0;
  const canFinalize = true; // Recipients are now optional

  // Render helpers
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const toggleRecipient = (id: any) => {
    const idString = typeof id === 'string' ? id : id.toString();
    setSelectedRecipientIds(prev =>
      prev.includes(idString) ? prev.filter(rId => rId !== idString) : [...prev, idString]
    );
  };

  // Step 1: Select File Types and Add Files
  if (step === 1) {
    return (
      <div className="p-4 pb-32 flex flex-col gap-6 animate-in slide-in-from-right duration-300 min-h-screen">
        <header className="flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go back">
              <span className="material-symbols-outlined text-xl text-primary">arrow_back</span>
            </button>
            <button onClick={() => navigate('/')} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go home">
              <span className="material-symbols-outlined text-xl text-primary">home</span>
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold">Add Items</h1>
            <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">Step 1 of 3</p>
          </div>
          <div className="w-10"></div>
        </header>

        {errorMessage && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in duration-300">
            <p className="text-red-500 text-sm font-bold">{errorMessage}</p>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] px-1">Select Content Types</h2>
          <div className="grid grid-cols-2 gap-3">
            {['pdf', 'note', 'image', 'audio'].map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                  selectedTypes.has(type)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-800 bg-surface-dark text-gray-500 hover:border-gray-700'
                }`}
              >
                <span className="material-symbols-outlined text-3xl">{getTypeIcon(type)}</span>
                <span className="text-xs font-black uppercase tracking-wider">{getTypeLabel(type)}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedTypes.size > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
            {Array.from(selectedTypes).map(type => (
              <div key={type} className="bg-surface-dark p-5 rounded-[24px] border border-gray-800 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-primary">{getTypeIcon(type)}</span>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">{getTypeLabel(type)}</h3>
                </div>

                {type === 'pdf' && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'pdf')}
                    />
                    <button
                      onClick={() => {
                        currentTypeRef.current = 'pdf';
                        fileInputRef.current?.click();
                      }}
                      className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">upload_file</span>
                      <span className="text-xs font-bold uppercase tracking-wider">Upload Document</span>
                    </button>
                  </div>
                )}

                {type === 'image' && (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="image-upload"
                      onChange={(e) => handleFileChange(e, 'image')}
                    />
                    <label
                      htmlFor="image-upload"
                      className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined">add_photo_alternate</span>
                      <span className="text-xs font-bold uppercase tracking-wider">Upload Photo</span>
                    </label>
                  </div>
                )}

                {type === 'audio' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAudioMode('upload')}
                        className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          audioMode === 'upload' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-500'
                        }`}
                      >
                        Upload
                      </button>
                      <button
                        onClick={() => setAudioMode('record')}
                        className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          audioMode === 'record' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-500'
                        }`}
                      >
                        Record
                      </button>
                    </div>

                    {audioMode === 'upload' ? (
                      <div>
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          id="audio-upload"
                          onChange={(e) => handleFileChange(e, 'audio')}
                        />
                        <label
                          htmlFor="audio-upload"
                          className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span className="material-symbols-outlined">audio_file</span>
                          <span className="text-xs font-bold uppercase tracking-wider">Upload Audio</span>
                        </label>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        {isRecording ? (
                          <>
                            <div className="text-2xl font-mono text-red-500 animate-pulse">{formatTime(recordingTime)}</div>
                            <button
                              onClick={stopRecording}
                              className="size-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-all"
                            >
                              <span className="material-symbols-outlined text-3xl">stop</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={startRecording}
                            className="size-16 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-all"
                          >
                            <span className="material-symbols-outlined text-3xl">mic</span>
                          </button>
                        )}
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                          {isRecording ? 'Tap to stop' : 'Tap to record'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {type === 'note' && (
                  <div className="space-y-3">
                    <textarea
                      id="note-textarea"
                      placeholder="Write your message here..."
                      className="w-full h-32 bg-surface-darker border border-gray-800 rounded-xl p-4 text-white text-sm resize-none focus:border-primary/50 focus:outline-none transition-colors"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDraftWithAI}
                        disabled={isGenerating}
                        className="flex-1 py-3 bg-amber-500/20 text-amber-500 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <>
                            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                            Generating...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                            Draft with AI
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement;
                          if (textarea) {
                            addNote(textarea.value);
                            textarea.value = '';
                          }
                        }}
                        className="flex-1 py-3 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add Message
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom duration-300">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] px-1">Added Items ({selectedFiles.length})</h2>
            {selectedFiles.map(file => (
              <div key={file.id} className="flex items-center gap-4 p-4 bg-surface-dark rounded-2xl border border-gray-800">
                <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-primary">{getTypeIcon(file.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{file.name}</p>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">{file.size}</p>
                </div>
                {file.type === 'audio' && file.url && (
                  <AudioPlayer src={file.url} compact />
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="size-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-dark/95 border-t border-gray-800 z-50">
          <button
            onClick={() => setStep(2)}
            disabled={!canProceed}
            className={`w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${
              canProceed
                ? 'bg-primary text-white shadow-xl shadow-primary/30 active:scale-[0.98]'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            <span>Continue</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Select Recipients
  if (step === 2) {
    return (
      <div className="p-4 pb-32 flex flex-col gap-6 animate-in slide-in-from-right duration-300 min-h-screen">
        <header className="flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go back">
              <span className="material-symbols-outlined text-xl text-primary">arrow_back</span>
            </button>
            <button onClick={() => navigate('/')} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go home">
              <span className="material-symbols-outlined text-xl text-primary">home</span>
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold">Select Recipients</h1>
            <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">Step 2 of 3</p>
          </div>
          <div className="w-10"></div>
        </header>

        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">Who should receive these {selectedFiles.length} items?</p>
          <p className="text-gray-500 text-xs mt-2">(Optional - you can assign recipients later from your vault)</p>
        </div>

        <div className="space-y-3 flex-1">
          {recipients.length === 0 ? (
            <div className="py-12 text-center bg-surface-dark/40 rounded-3xl border border-dashed border-gray-800">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No recipients yet</p>
              <button onClick={() => navigate('/add-recipient')} className="text-primary text-[10px] font-black uppercase tracking-widest mt-2 hover:underline">Add someone</button>
            </div>
          ) : (
            recipients.map(r => (
              <label
                key={r._id}
                className={`flex items-center gap-4 p-4 rounded-[24px] bg-surface-dark border transition-all cursor-pointer select-none ${
                  selectedRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString()) ? 'border-primary shadow-[0_0_15px_rgba(23,84,207,0.1)]' : 'border-gray-800'
                }`}
              >
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all bg-surface-darker ${
                    selectedRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString()) ? 'border-primary grayscale-0' : 'border-gray-800 grayscale'
                  }`}>
                    {r.avatarUrl ? (
                      <img src={r.avatarUrl} className="h-full w-full object-cover" alt={r.name} />
                    ) : (
                      <span className="text-primary font-black text-xs uppercase">{getInitials(r.name)}</span>
                    )}
                  </div>
                  {selectedRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString()) && (
                    <div className="absolute -top-1 -right-1 size-5 bg-primary rounded-full border-2 border-surface-dark flex items-center justify-center">
                      <span className="material-symbols-outlined text-[12px] text-white font-black">check</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold transition-colors ${selectedRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString()) ? 'text-white' : 'text-gray-400'}`}>{r.name}</p>
                  <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">{r.relationship}</p>
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString())}
                  onChange={() => toggleRecipient(r._id)}
                />
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString()) ? 'bg-primary border-primary' : 'border-gray-700'
                }`}>
                  {selectedRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString()) && <span className="material-symbols-outlined text-[16px] text-white">check</span>}
                </div>
              </label>
            ))
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-dark/95 border-t border-gray-800 z-50">
          <button
            onClick={() => setStep(3)}
            className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/30 active:scale-[0.98]"
          >
            <span>{selectedRecipientIds.length > 0 ? 'Continue' : 'Continue (Skip Recipients)'}</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Review and Confirm
  return (
    <div className="p-4 pb-32 flex flex-col gap-6 animate-in slide-in-from-right duration-300 min-h-screen">
      <header className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setStep(2)} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go back">
            <span className="material-symbols-outlined text-xl text-primary">arrow_back</span>
          </button>
          <button onClick={() => navigate('/')} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go home">
            <span className="material-symbols-outlined text-xl text-primary">home</span>
          </button>
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold">Review & Save</h1>
          <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">Step 3 of 3</p>
        </div>
        <div className="w-10"></div>
      </header>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in duration-300">
          <p className="text-red-500 text-sm font-bold">{errorMessage}</p>
        </div>
      )}

      <div className="bg-surface-dark p-5 rounded-[24px] border border-gray-800 space-y-4">
        <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Items to Save ({selectedFiles.length})</h2>
        <div className="space-y-2">
          {selectedFiles.map(file => (
            <div key={file.id} className="flex items-center gap-3 p-3 bg-surface-darker rounded-xl">
              <span className="material-symbols-outlined text-xl text-primary">{getTypeIcon(file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{file.name}</p>
                <p className="text-gray-500 text-[10px] uppercase">{file.size}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-dark p-5 rounded-[24px] border border-gray-800 space-y-4">
        <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Recipients ({selectedRecipientIds.length})</h2>
        <div className="flex flex-wrap gap-2">
          {selectedRecipientIds.map(id => {
            const recipient = recipients.find(r => r._id === id);
            return recipient ? (
              <div key={id} className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-full">
                <div className="size-6 rounded-full bg-surface-darker flex items-center justify-center overflow-hidden">
                  {recipient.avatarUrl ? (
                    <img src={recipient.avatarUrl} className="h-full w-full object-cover" alt={recipient.name} />
                  ) : (
                    <span className="text-primary font-bold text-[8px]">{getInitials(recipient.name)}</span>
                  )}
                </div>
                <span className="text-primary text-xs font-bold">{recipient.name}</span>
              </div>
            ) : null;
          })}
        </div>
      </div>

      {encryptionKey && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
          <span className="material-symbols-outlined text-green-500">lock</span>
          <p className="text-green-500 text-xs font-bold">Your messages will be encrypted</p>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-dark/95 border-t border-gray-800 z-50">
        <button
          onClick={finalize}
          disabled={isSaving}
          className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>Save to Vault</span>
              <span className="material-symbols-outlined">check</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default UploadWizard;