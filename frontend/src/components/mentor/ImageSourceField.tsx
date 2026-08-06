'use client';

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadApi } from '@/services/upload.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { ACCEPT_ATTR, isUploadedAsset, validateImageFile } from '@/lib/imageUpload';

/**
 * Reusable image picker: the mentor either uploads a file (stored via the
 * platform's storage provider) OR points at an external image URL — both write
 * the resulting URL to the same `value`, so existing URL-based images keep
 * working. Used for the brand logo, the landing hero photo, and product tier
 * images.
 */
export function ImageSourceField({
  label,
  value,
  onChange,
  helpText,
  placeholder = 'https://example.com/image.png',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helpText?: string;
  placeholder?: string;
}) {
  const [source, setSource] = useState<'upload' | 'url'>(
    value && !isUploadedAsset(value) ? 'url' : 'upload',
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = async (file: File) => {
    const invalid = validateImageFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const { url } = await uploadApi.uploadImage(file);
      onChange(url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again still fires onChange.
    e.target.value = '';
    if (file) void pickFile(file);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="flex gap-4 text-sm">
        {(['upload', 'url'] as const).map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              checked={source === opt}
              onChange={() => {
                setSource(opt);
                setUploadError('');
              }}
            />
            {opt === 'upload' ? 'Upload file' : 'External URL'}
          </label>
        ))}
      </div>

      {source === 'upload' ? (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={onFileChange}
            className="hidden"
          />
          {value ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Preview"
                className="h-12 w-12 rounded border bg-accent/20 object-contain p-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : 'Replace'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange('');
                  setUploadError('');
                }}
                disabled={uploading}
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? 'Uploading…' : 'Choose file'}
            </Button>
          )}
          {helpText ? (
            <p className="text-xs text-muted-foreground">{helpText}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              PNG, SVG, JPG, JPEG or WEBP · up to 5 MB.
            </p>
          )}
          <ErrorMessage message={uploadError} />
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
          {value ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Preview"
                className="h-12 w-12 rounded border bg-accent/20 object-contain p-1"
              />
              <span className="text-xs text-muted-foreground">Live preview</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
