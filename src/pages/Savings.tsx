import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Target, MoreVertical, Edit, Trash } from "lucide-react";
import { useSavings } from "../context/SavingsContext";
import { useCurrency } from "../hooks/useCurrency";
import { SavingsGoalModal } from "../components/SavingsGoalModal";
import type { SavingsGoal } from "../types";
import { format } from "date-fns";

export default function Savings() {
  const { savingsGoals, loading, deleteSavingsGoal } = useSavings();
  const { formatAmount } = useCurrency();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const handleEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleAddNewGoal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Financial Goals</h1>
          <p className="text-muted-foreground mt-1 font-medium">Track your progress towards your dreams.</p>
        </div>
        <button
          onClick={handleAddNewGoal}
          className="bg-primary text-primary-foreground px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          <Plus className="h-5 w-5" />
          Add New Goal
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : savingsGoals.length === 0 ? (
        <div className="text-center py-20">
          <Target className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-bold">No Savings Goals Yet</h2>
          <p className="mt-2 text-muted-foreground">Click "Add New Goal" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {savingsGoals.map((goal) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-foreground">{goal.name}</h3>
                  <div className="relative">
                    <button className="p-2 rounded-full hover:bg-accent">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg z-10 hidden group-hover:block">
                      <button
                        onClick={() => handleEditGoal(goal)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent w-full"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSavingsGoal(goal.id)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-accent w-full"
                      >
                        <Trash className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-bold uppercase px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {goal.type}
                  </span>
                  {goal.dueDate && (
                    <span className="text-xs font-bold uppercase px-2 py-1 rounded-full bg-accent/50 text-muted-foreground">
                      Due: {format(new Date(goal.dueDate), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-4">Target: {formatAmount(goal.targetAmount)}</p>
                <p className="text-sm text-muted-foreground">Saved: {formatAmount(goal.currentAmount)}</p>
              </div>
              <div className="mt-4">
                <div className="h-3 bg-accent/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }}
                    className="h-full bg-success rounded-full"
                    style={{ backgroundColor: goal.color }}
                  />
                </div>
                <div className="text-right text-sm mt-1 font-bold text-foreground">
                  {Math.round((goal.currentAmount / goal.targetAmount) * 100)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <SavingsGoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingGoal={editingGoal}
      />
    </div>
  );
}
