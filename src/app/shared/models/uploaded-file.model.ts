export interface UploadedFile {
  id: string;
  url: string;
  originalName: string; // required string
  size?: number;
  mimeType?: string;
  // other optional fields if needed later
}
