export interface Meme {
  id: number;
  title: string;
  imageUrl: string;
  author: string;
  tags: string[];
  likes: number;
  comments: number;
  description: string;
  date: Date;
  isLiked?: boolean;
}