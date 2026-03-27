import { useState, useEffect } from 'react';
import { AdminLayout } from '../Components/AdminLayout';
import { DataTable, type DataTableColumn, type DataTableAction } from '../Components/DataTable';
import { FormModal } from '../Components/FormModal';
import { ConfirmationModal } from '../Components/ConfirmationModal';
import { useSnackbar } from '../Components/SnackbarProvider';
import {
  getBooks,
  getBookDetail,
  searchBooks,
  deleteBook,
  createBook,
  updateBook,
} from '../api/books';
import type { Book } from '../interfaces/admin';

export function BooksManagementPage() {
  const { success, error } = useSnackbar();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    bookId?: string;
  }>({ isOpen: false });

  // Fetch books
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setIsLoading(true);
        const data = await getBooks(currentPage, 10);
        const mappedBooks: Book[] = (data.items || []).map((item: any) => ({
          bookId: String(item.id ?? item.bookId ?? ''),
          title: item.title,
          author: item.author,
          price: item.price,
          condition: item.status,
          isAvailable: item.isAvailable,
          description: item.description,
          isbn: item.isbn,
          publicationYear: item.publicationYear,
          publisher: item.publisher,
          language: item.language,
          pageCount: item.pageCount,
          coverUrl: item.coverUrl,
          previewUrl: item.previewUrl,
        }));
        setBooks(mappedBooks);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        error('Error al cargar libros');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [currentPage, error]);


  const handleSearch = async (query: string) => {
    if (!query) {
      setCurrentPage(1);
      return;
    }

    try {
      setIsLoading(true);
      const data = await searchBooks(query, 1);
      const mappedBooks: Book[] = (data.items || []).map((item: any) => ({
        bookId: String(item.id ?? item.bookId ?? ''),
        title: item.title,
        author: item.author,
        price: item.price,
        condition: item.status,
        isAvailable: item.isAvailable,
        description: item.description,
        isbn: item.isbn,
        publicationYear: item.publicationYear,
        publisher: item.publisher,
        language: item.language,
        pageCount: item.pageCount,
        coverUrl: item.coverUrl,
        previewUrl: item.previewUrl,
      }));
      setBooks(mappedBooks);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(1);
    } catch (err) {
      error('Error en la búsqueda');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBook = () => {
    setEditingBook(null);
    setIsFormOpen(true);
  };

  const handleEditBook = async (book: Book) => {
    try {
      setIsLoading(true);
      const bookDetail = await getBookDetail(book.bookId);
      const normalized: Book = {
        bookId: String(bookDetail.id),
        title: bookDetail.title,
        author: bookDetail.author,
        publicationYear: bookDetail.publicationYear,
        publisher: bookDetail.publisher,
        isbn: bookDetail.isbn,
        language: bookDetail.language,
        pageCount: bookDetail.pageCount,
        price: bookDetail.price,
        condition: bookDetail.status,
        isAvailable: bookDetail.isAvailable,
        description: bookDetail.description,
        coverUrl: bookDetail.coverUrl,
        previewUrl: bookDetail.preview,
      };
      setEditingBook(normalized);
      setIsFormOpen(true);
    } catch (err) {
      error('Error al cargar datos del libro');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (bookId: string) => {
    setDeleteConfirm({ isOpen: true, bookId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.bookId) return;

    try {
      setIsLoading(true);
      await deleteBook(deleteConfirm.bookId);
      success('Libro eliminado exitosamente');
      setCurrentPage(1);
      setDeleteConfirm({ isOpen: false });
    } catch (err) {
      error('Error al eliminar libro');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (formData: FormData) => {
    try {
      setIsLoading(true);
      const publicationYearValue = formData.get('publicationYear') as string;
      const pageCountValue = formData.get('pageCount') as string;
      const priceValue = formData.get('price') as string;

      const data = {
        title: (formData.get('title') as string) || '',
        author: (formData.get('author') as string) || '',
        publicationYear: publicationYearValue
          ? parseInt(publicationYearValue, 10)
          : undefined,
        publisher: (formData.get('publisher') as string) || undefined,
        isbn: (formData.get('isbn') as string) || undefined,
        language: (formData.get('language') as string) || undefined,
        pageCount: pageCountValue ? parseInt(pageCountValue, 10) : undefined,
        price: priceValue ? parseFloat(priceValue) : 0,
        condition: (formData.get('condition') as string) as 'new' | 'used' | undefined,
        isAvailable: (formData.get('isAvailable') as string) === 'on',
        description: (formData.get('description') as string) || undefined,
        coverUrl: (formData.get('coverUrl') as string) || undefined,
        previewUrl: (formData.get('previewUrl') as string) || undefined,
      };

      if (editingBook) {
        await updateBook(editingBook.bookId, data);
        success('Libro actualizado exitosamente');
      } else {
        await createBook(data);
        success('Libro creado exitosamente');
      }

      setIsFormOpen(false);
      setCurrentPage(1);
    } catch (err) {
      error('Error al guardar libro');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: DataTableColumn<Book>[] = [
    {
      key: 'title',
      label: 'Título',
      width: '25%',
    },
    {
      key: 'author',
      label: 'Autor',
      width: '20%',
    },
    {
      key: 'price',
      label: 'Precio',
      render: (value) => `$${Number(value).toFixed(2)}`,
      width: '15%',
    },
    {
      key: 'condition',
      label: 'Condición',
      width: '15%',
      render: (value) => (value ? String(value) : 'N/A'),
    },
    {
      key: 'isAvailable',
      label: 'Disponible',
      width: '10%',
      render: (value) => (value ? 'Sí' : 'No'),
    },
  ];

  const actions: DataTableAction<Book>[] = [
    {
      label: 'Editar',
      icon: '✏️',
      onClick: (book) => handleEditBook(book),
      variant: 'secondary',
    },
    {
      label: 'Eliminar',
      icon: '🗑️',
      onClick: (book) => handleDeleteClick(book.bookId),
      variant: 'destructive',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text">Gestión de Libros</h1>
            <p className="text-text-muted mt-2">
              Administra el catálogo de libros disponibles
            </p>
          </div>
          <div className="w-full md:w-auto">
            <button
              onClick={handleAddBook}
              className="w-full md:w-auto px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              ➕ Agregar Libro
            </button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable<Book>
          columns={columns}
          data={books}
          actions={actions}
          isLoading={isLoading}
          onSearch={handleSearch}
          searchPlaceholder="Buscar por título o ISBN..."
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
          }}
          emptyMessage="No hay libros disponibles"
        />
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={isFormOpen}
        title={editingBook ? 'Editar Libro' : 'Crear Libro'}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBook(null);
        }}
        onSubmit={handleFormSubmit}
        isLoading={isLoading}
        submitText={editingBook ? 'Actualizar' : 'Crear'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Título</label>
            <input
              type="text"
              name="title"
              required
              defaultValue={editingBook?.title || ''}
              placeholder="Nombre del libro"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Autor</label>
            <input
              type="text"
              name="author"
              required
              defaultValue={editingBook?.author || ''}
              placeholder="Nombre del autor"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Precio</label>
              <input
                type="number"
                name="price"
                required
                step="0.01"
                min="0"
                defaultValue={editingBook?.price ?? ''}
                placeholder="0.00"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Año de publicación</label>
              <input
                type="number"
                name="publicationYear"
                min="1000"
                max="2100"
                defaultValue={editingBook?.publicationYear ?? ''}
                placeholder="e.g. 2023"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Editorial</label>
              <input
                type="text"
                name="publisher"
                defaultValue={editingBook?.publisher || ''}
                placeholder="Editorial"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">ISBN</label>
              <input
                type="text"
                name="isbn"
                defaultValue={editingBook?.isbn || ''}
                placeholder="ISBN"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Idioma</label>
              <input
                type="text"
                name="language"
                defaultValue={editingBook?.language || ''}
                placeholder="Español"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Número de páginas</label>
              <input
                type="number"
                name="pageCount"
                min="1"
                defaultValue={editingBook?.pageCount ?? ''}
                placeholder="0"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Condición</label>
              <select
                name="condition"
                defaultValue={editingBook?.condition || 'new'}
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text focus:outline-none focus:border-border-focus transition-colors"
              >
                <option value="new">Nuevo</option>
                <option value="used">Usado</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isAvailable"
                type="checkbox"
                name="isAvailable"
                defaultChecked={editingBook?.isAvailable ?? true}
                className="h-4 w-4 text-primary-600 border-border focus:ring-primary-500"
              />
              <label htmlFor="isAvailable" className="text-sm text-text">
                Disponible
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Descripción</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={editingBook?.description || ''}
              placeholder="Resumen del libro"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">URL de portada (opcional)</label>
            <input
              type="url"
              name="coverUrl"
              defaultValue={editingBook?.coverUrl || ''}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">URL de vista previa (opcional)</label>
            <input
              type="url"
              name="previewUrl"
              defaultValue={editingBook?.previewUrl || ''}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title="Confirmar eliminación"
        message="¿Estás seguro de que deseas eliminar este libro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ isOpen: false })}
        isConfirmLoading={isLoading}
      />
    </AdminLayout>
  );
}
