import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Tag, DollarSign } from "lucide-react";
import { useSavings } from "../context/SavingsContext";
import { useToast } from "../context/ToastContext";
import type { SavingsGoal } from "../types";

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGoal?: SavingsGoal | null;
}

export const SavingsGoalModal: React.FC<SavingsGoalModalProps> = ({ isOpen, onClose, editingGoal }) => {
  const { addSavingsGoal, updateSavingsGoal } = useSavings();
  const { showToast } = useToast();
  const [name, setName] = useState(editingGoal?.name || "");
  const [description, setDescription] = useState(editingGoal?.description || "");
  const [targetAmount, setTargetAmount] = useState(editingGoal?.targetAmount.toString() || "");
  const [type, setType] = useState<"short-term" | "long-term">(editingGoal?.type || "short-term");
  const [dueDate, setDueDate] = useState(editingGoal?.dueDate || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || isNaN(Number(targetAmount))) {
      showToast("Please enter a valid name and target amount", "error");
      return;
    }

    const goalData: Omit<SavingsGoal, "id" | "currentAmount" | "createdAt"> = {
      name,
      description,
      targetAmount: Number(targetAmount),
      type,
      dueDate,
      color: "#3b82f6",
      icon: "Target",
    };

    try {
      if (editingGoal) {
        await updateSavingsGoal(editingGoal.id, goalData);
        showToast("Goal updated successfully", "success");
      } else {
        await addSavingsGoal({ ...goalData, createdAt: new Date().toISOString() });
        showToast("Goal added successfully", "success");
      }
      onClose();
    } catch (error) {
      console.error("Error saving goal:", error);
      showToast("Failed to save goal", "error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border"
          >
            <div className="p-6 flex items-center justify-between border-b border-border">
              <h2 className="text-2xl font-bold text-foreground">{editingGoal ? "Edit Goal" : "New Financial Goal"}</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-full"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="p-8 space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Goal Name</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., New Car, Vacation"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short description of your goal"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">Target Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">Goal Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition appearance-none"
                  >
                    <option value="short-term">Short-term</option>
                    <option value="long-term">Long-term</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Due Date (Optional)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl border border-border font-bold text-sm uppercase tracking-wider hover:bg-accent transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-105 transition"
                >
                  {editingGoal ? "Update Goal" : "Save Goal"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
