export interface Meme {
  id: string;
  title: string;
  imageUrl: string;
  author: string;
  authorId: string;
  tags: string[];
  likes: number;
  comments: number;
  description: string;
  date: Date;
  isLiked?: boolean | null;
  dislikes: number;
}

export interface MemeResponse {
  success: boolean;
  message: string;
  data: Meme;
}