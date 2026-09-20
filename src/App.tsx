import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { PinGate } from './components/common/PinGate';
import { Header } from './components/common/Header';
import { Navigation } from './components/common/Navigation';
import { ToastContainer } from './components/common/ToastContainer';
import { PinHubModal } from './components/common/PinHubModal';
import { PinManagementModal } from './components/common/PinManagementModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { AddExpenseForm } from './components/expenses/AddExpenseForm';
import { ExpenseHistory } from './components/expenses/ExpenseHistory';
import { SettlementView } from './components/settlements/SettlementView';
import { VendorView } from './components/vendors/VendorView';
import { ReportsView } from './components/reports/ReportsView';
import { motion, AnimatePresence } from 'motion/react';

const MainLayout: React.FC = () => {
  const { activeTab, isPinHubModalOpen, closePinHubModal, pinHubActionTitle } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white dark:selection:bg-indigo-500 dark:selection:text-white pb-24 md:pb-12">
      <Header />
      <Navigation />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'add-expense' && <AddExpenseForm />}
            {activeTab === 'expenses' && <ExpenseHistory />}
            {activeTab === 'settlements' && <SettlementView />}
            {activeTab === 'vendors' && <VendorView />}
            {activeTab === 'reports' && <ReportsView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <PinHubModal
        isOpen={isPinHubModalOpen}
        onClose={closePinHubModal}
        actionTitle={pinHubActionTitle}
      />

      <PinManagementModal />

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
