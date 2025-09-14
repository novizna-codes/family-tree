import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useFamilyTreeStore } from '@/store/familyTreeStore';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { TreeList } from '@/components/trees/TreeList';
import { CreateTreeModal } from '@/components/trees/CreateTreeModal';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { 
    trees, 
    loading, 
    error, 
    loadTrees, 
    createTree, 
    deleteTree,
    clearError 
  } = useFamilyTreeStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTrees();
  }, [loadTrees]);

  const handleCreateTree = async (data: { name: string; description: string }) => {
    await createTree(data);
    setShowCreateModal(false);
  };

  const handleDeleteTree = async (id: string) => {
    if (window.confirm(t('tree.deleteConfirm'))) {
      await deleteTree(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Family Tree Builder
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <span className="text-sm text-gray-700">
                {t('common.name')}: {user?.name}
              </span>
              <Button variant="outline" onClick={logout}>
                {t('common.logout')}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex justify-between items-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('dashboard.title')}
              </h2>
              <p className="text-gray-600 mt-1">
                {t('dashboard.subtitle')}
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              {t('dashboard.createTree')}
            </Button>
          </div>

          <TreeList
            trees={trees}
            loading={loading}
            onCreateTree={() => setShowCreateModal(true)}
            onDeleteTree={handleDeleteTree}
          />
        </div>
      </main>

      <CreateTreeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTree}
      />
    </div>
  );
};