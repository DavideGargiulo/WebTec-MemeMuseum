import { Component, signal, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule, ImagePlus, X, Plus, Upload, Loader2 } from 'lucide-angular';
import { MemeService } from '../_services/meme/meme.service';
import { ToastService } from '../_services/toast/toast.service';

// Importazioni RxJS per l'autocompletamento
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

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
export class CreaMemeComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Icons
  icons = { ImagePlus, X, Plus, Upload, Loader2 };

  // Signals
  imagePreview = signal<string | null>(null);
  isDragging = signal(false);
  isLoading = signal(false);
  tags = signal<string[]>([]);
  suggestedTags = signal<string[]>([]); // Nuovo signal per i tag suggeriti
  
  // Form & Tags
  memeForm: FormGroup;
  currentTag = '';
  selectedFile: File | null = null;

  // RxJS Subject per gestire la ricerca mentre si digita
  private tagSearchSubject = new Subject<string>();
  private tagSearchSubscription!: Subscription;

  constructor(
    private fb: FormBuilder, 
    private memeService: MemeService, 
    private router: Router, 
    private toastService: ToastService
  ) {
    this.memeForm = this.fb.group({
      image: [null, Validators.required],
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    });
  }

  ngOnInit() {
    this.tagSearchSubscription = this.tagSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query.trim()) {
          return of([]); // Se vuoto, ritorna array vuoto senza chiamare il backend
        }
        return this.memeService.searchTagsAutocomplete(query).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe(tagsFromDb => {
      // Rimuovi dai suggerimenti i tag che l'utente ha già aggiunto
      const filteredTags = tagsFromDb.filter(t => !this.tags().includes(t));
      this.suggestedTags.set(filteredTags);
    });
  }

  ngOnDestroy() {
    if (this.tagSearchSubscription) {
      this.tagSearchSubscription.unsubscribe();
    }
  }

  // Chiamato ogni volta che l'utente digita
  onTagInput(value: string) {
    this.currentTag = value;
    this.tagSearchSubject.next(value);
  }

  // File Upload Methods
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) this.handleFile(input.files[0]);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault(); event.stopPropagation(); this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault(); event.stopPropagation(); this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault(); event.stopPropagation(); this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files[0]) this.handleFile(files[0]);
  }

  handleFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.toastService.error('Per favore carica solo file immagine');
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toastService.error('Il file è troppo grande. Dimensione massima: 10MB');
      return;
    }

    this.selectedFile = file;
    this.memeForm.patchValue({ image: file });
    this.memeForm.get('image')?.markAsTouched();

    const reader = new FileReader();
    reader.onload = (e) => { this.imagePreview.set(e.target?.result as string); };
    reader.readAsDataURL(file);
  }

  removeImage(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.imagePreview.set(null);
    this.memeForm.patchValue({ image: null });
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  // Tag Management
  addTag(tagToAdd?: string, event?: Event): void {
    if (event) event.preventDefault();

    const tag = (tagToAdd || this.currentTag).trim().toLowerCase();
    
    if (!tag) return;

    if (this.tags().includes(tag)) {
      this.toastService.warning('Questo tag è già stato aggiunto');
      this.currentTag = '';
      this.suggestedTags.set([]);
      return;
    }

    if (this.tags().length >= 3) {
      this.toastService.warning('Puoi aggiungere massimo 3 tag');
      return;
    }

    this.tags.update(tags => [...tags, tag]);
    this.currentTag = '';
    this.suggestedTags.set([]); // Pulisce i suggerimenti
  }

  removeTag(tagToRemove: string): void {
    this.tags.update(tags => tags.filter(tag => tag !== tagToRemove));
  }

  // Form Submission
  onSubmit(): void {
    if (this.memeForm.invalid) {
      Object.keys(this.memeForm.controls).forEach(key => {
        this.memeForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading.set(true);

    const formData = new FormData();
    if (this.selectedFile) formData.append('image', this.selectedFile);
    formData.append('title', this.memeForm.get('title')?.value);
    formData.append('description', this.memeForm.get('description')?.value);
    formData.append('tags', JSON.stringify(this.tags()));

    this.memeService.createMeme(formData).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.toastService.success('Meme pubblicato con successo!');
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error creating meme:', error);
        this.toastService.error('Errore durante la pubblicazione del meme');
      }
    });
  }
}