import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
  onImageRemoved?: () => void;
  folder?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  shape?: "square" | "circle";
  label?: string;
}

export function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  folder = "images",
  className = "",
  size = "md",
  shape = "square",
  label = "Adicionar Imagem",
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);

  // Sync preview when currentImageUrl prop changes (e.g., opening edit dialog)
  useEffect(() => {
    setPreview(currentImageUrl || null);
  }, [currentImageUrl]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.upload.image.useMutation();

  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-48 h-48",
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Por favor, selecione apenas arquivos de imagem.");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5MB.");
        return;
      }

      // Show preview immediately
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Full = event.target?.result as string;
        setPreview(base64Full);

        // Upload to S3
        setIsUploading(true);
        try {
          const base64Data = base64Full.split(",")[1];
          const result = await uploadMutation.mutateAsync({
            base64: base64Data,
            mimeType: file.type,
            folder,
          });
          onImageUploaded(result.url);
        } catch (error) {
          console.error("Erro ao fazer upload:", error);
          alert("Erro ao fazer upload da imagem. Tente novamente.");
          setPreview(currentImageUrl || null);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [folder, onImageUploaded, currentImageUrl, uploadMutation]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onImageRemoved?.();
  }, [onImageRemoved]);

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        className={`relative ${sizeClasses[size]} ${
          shape === "circle" ? "rounded-full" : "rounded-lg"
        } border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer overflow-hidden bg-muted/20 flex items-center justify-center group`}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className={`w-full h-full object-cover ${
                shape === "circle" ? "rounded-full" : "rounded-lg"
              }`}
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2
                  className="animate-spin text-white"
                  size={iconSizes[size]}
                />
              </div>
            )}
            {!isUploading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="text-white" size={iconSizes[size]} />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
            {isUploading ? (
              <Loader2 className="animate-spin" size={iconSizes[size]} />
            ) : (
              <>
                <Upload size={iconSizes[size]} />
                {size !== "sm" && (
                  <span className="text-xs text-center px-2">{label}</span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {preview && !isUploading && onImageRemoved && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive/80 h-6 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
        >
          <X size={12} className="mr-1" />
          Remover
        </Button>
      )}
    </div>
  );
}
