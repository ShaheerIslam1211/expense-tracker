import { createContext, useState, useContext } from "react";
import type { ReactNode } from "react";
import { TransactionModal } from "../components/TransactionModal";
import type { Expense } from "../types";

interface ModalContextValue {
  showTransactionModal: (transaction?: Expense) => void;
  hideTransactionModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Expense | undefined>();

  const showTransactionModal = (transaction?: Expense) => {
    setEditingTransaction(transaction);
    setIsOpen(true);
  };

  const hideTransactionModal = () => {
    setIsOpen(false);
    // Delay clearing the transaction to prevent content from disappearing during the closing animation
    setTimeout(() => {
      setEditingTransaction(undefined);
    }, 300);
  };

  const value = {
    showTransactionModal,
    hideTransactionModal,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      <TransactionModal
        isOpen={isOpen}
        onClose={hideTransactionModal}
        editingTransaction={editingTransaction}
      />
    </ModalContext.Provider>
  );
};
