import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import { AdminLayout } from '../Components/AdminLayout';
import {
  DataTable,
  type DataTableColumn,
  type DataTableAction,
} from '../Components/DataTable';
import { ConfirmationModal } from '../Components/ConfirmationModal';
import { useSnackbar } from '../Components/SnackbarProvider';
import { getRoleFromToken, getAccessToken } from '../auth/session';
import {
  getBooks,
  getBookDetail,
  searchBooks,
  deleteBook,
  createBook,
  updateBook,
  updateBookInventory,
  uploadBookGallery,
  uploadBookImage,
} from '../api/books';
import { getCategories } from '../api/categories';
import { getStores } from '../api/stores';
import { BookForm } from '../Components/BookForm/BookForm';
import type { Book, Store, Category } from '../interfaces/admin';
import type { BookDetailItem } from '../api/books';
export function BooksManagementPage() {
  const navigate = useNavigate();
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  const { success, error } = useSnackbar();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookDetailItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    bookId?: string;
  }>({ isOpen: false });

  // Redirect root users
  useEffect(() => {
    if (role === 'root') {
      navigate('/admin/create-admin', { replace: true });
    }
  }, [role, navigate]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        const mappedCategories: Category[] = data.map((cat: any) => ({
          categoryId: cat.categoryId?.toString() || cat.id?.toString() || '',
          name: cat.name,
          description: cat.description,
        }));
        setCategories(mappedCategories);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  // Fetch stores
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const data = await getStores();
        const mappedStores: Store[] = (data.items || data || []).map(
          (store: any) => ({
            storeId: store.storeId?.toString() || store.id?.toString() || '',
            name: store.name,
            address: store.address,
            city: store.city,
            latitude: store.latitude,
            longitude: store.longitude,
            capacity: store.capacity,
            status: store.status || 'active',
          }),
        );
        setStores(mappedStores);
      } catch (err) {
        console.error('Error fetching stores:', err);
      }
    };

    fetchStores();
  }, []);

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
      setEditingBook(bookDetail);
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
      window.location.reload();
    } catch (err) {
      error('Error al eliminar libro');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (
    data: {
      title: string;
      author: string;
      publicationYear?: number;
      publisher?: string;
      isbn?: string;
      language?: string;
      pageCount?: number;
      price: number;
      condition?: 'new' | 'used';
      isAvailable?: boolean;
      description?: string;
      coverUrl?: string;
      previewUrl?: string;
      categoryIds: number[];
      initialInventoryQuantity?: number;
    },
    inventoryItems: { storeId: number; availableQuantity: number }[],
    galleryFiles: File[],
    coverFile: File | null,
  ) => {
    try {
      setIsLoading(true);

      if (editingBook) {
        await updateBook(editingBook.id.toString(), data);
        if (inventoryItems.length > 0) {
          await updateBookInventory(editingBook.id.toString(), inventoryItems);
        }
        success('Libro actualizado exitosamente');
      } else {
        const createdBook = await createBook(data);
        const bookId = String(
          createdBook?.id ?? createdBook?.bookId ?? createdBook ?? '',
        );
        if (!bookId) {
          throw new Error('No se pudo obtener el ID del libro creado');
        }

        if (inventoryItems.length > 0) {
          await updateBookInventory(bookId, inventoryItems);
        }

        if (coverFile) {
          await uploadBookImage(bookId, coverFile);
        }

        if (galleryFiles.length > 0) {
          await uploadBookGallery(bookId, galleryFiles);
        }

        success('Libro creado exitosamente');
      }

      setIsFormOpen(false);
      setCurrentPage(1);
      setEditingBook(null);
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

      {/* Book Form Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBook(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
          {editingBook ? 'Editar Libro' : 'Crear Libro'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <BookForm
            initialData={editingBook || undefined}
            stores={stores}
            categories={categories}
            isLoading={isLoading}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingBook(null);
            }}
          />
        </DialogContent>
      </Dialog>

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
