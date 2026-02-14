import { Component, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule, ImagePlus, X, Plus, Upload, Loader2 } from 'lucide-angular';
import { MemeService } from '../_services/meme/meme.service';

@Component({
  selector: 'app-crea-meme',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    LucideAngularModule
  ],
  templateUrl: './create-meme.html'
})
export class CreaMemeComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Icons
  icons = {
    ImagePlus,
    X,
    Plus,
    Upload,
    Loader2
  };

  // Signals
  imagePreview = signal<string | null>(null);
  isDragging = signal(false);
  isLoading = signal(false);
  tags = signal<string[]>([]);
  
  // Form
  memeForm: FormGroup;
  currentTag = '';
  selectedFile: File | null = null;

  constructor(private fb: FormBuilder, private memeService: MemeService, private router: Router) {
    this.memeForm = this.fb.group({
      image: [null, Validators.required],
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    });
  }

  // File Upload Methods
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files[0]) {
      this.handleFile(files[0]);
    }
  }

  handleFile(file: File): void {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Per favore carica solo file immagine');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      alert('Il file è troppo grande. Dimensione massima: 10MB');
      return;
    }

    this.selectedFile = file;
    this.memeForm.patchValue({ image: file });
    this.memeForm.get('image')?.markAsTouched();

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeImage(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.imagePreview.set(null);
    this.memeForm.patchValue({ image: null });
    
    // Reset file input
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Tag Management
  addTag(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    const tag = this.currentTag.trim().toLowerCase();
    
    if (!tag) return;

    // Check if tag already exists
    if (this.tags().includes(tag)) {
      alert('Questo tag è già stato aggiunto');
      this.currentTag = '';
      return;
    }

    // Check max tags limit
    if (this.tags().length >= 10) {
      alert('Puoi aggiungere massimo 10 tag');
      return;
    }

    // Add tag
    this.tags.update(tags => [...tags, tag]);
    this.currentTag = '';
  }

  removeTag(tagToRemove: string): void {
    this.tags.update(tags => tags.filter(tag => tag !== tagToRemove));
  }

  // Form Submission
  onSubmit(): void {
    if (this.memeForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.memeForm.controls).forEach(key => {
        this.memeForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading.set(true);

    // Prepare form data
    const formData = new FormData();
    
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }
    
    formData.append('title', this.memeForm.get('title')?.value);
    formData.append('description', this.memeForm.get('description')?.value);
    formData.append('tags', JSON.stringify(this.tags()));

    // Simulate API call
    console.log('Submitting meme:', {
      title: this.memeForm.get('title')?.value,
      description: this.memeForm.get('description')?.value,
      tags: this.tags(),
      file: this.selectedFile
    });

    this.memeService.createMeme(formData).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error creating meme:', error);
        alert('Errore durante la pubblicazione del meme');
      }
    });
  }

  resetForm(): void {
    this.memeForm.reset();
    this.selectedFile = null;
    this.imagePreview.set(null);
    this.tags.set([]);
    this.currentTag = '';
    
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
}