import { useState, useEffect } from "react";
import { useBudget } from "../context/BudgetContext";
import { useCategories } from "../context/CategoryContext";
import { useAuth } from "../context/AuthContext";
import { useExpenses } from "../context/ExpenseContext";
import { useSavings } from "../context/SavingsContext";
import { useTheme } from "../context/ThemeContext";
import {
  User,
  Settings as SettingsIcon,
  Palette,
  Camera,
  Check,
  Save,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Trash2,
  Plus,
  Target,
  Download,
} from "lucide-react";
import { cn } from "../utils/cn";
import { useCurrency } from "../hooks/useCurrency";
import type { Expense } from "../types";

const OPENAI_KEY_STORAGE = "expense-tracker-openai-key";

function loadStoredApiKey(): string {
  try {
    return localStorage.getItem(OPENAI_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

function saveApiKey(key: string) {
  try {
    if (key.trim()) localStorage.setItem(OPENAI_KEY_STORAGE, key.trim());
    else localStorage.removeItem(OPENAI_KEY_STORAGE);
  } catch {
    // ignore
  }
}

export default function Settings() {
  const { monthlyBudget, setMonthlyBudget } = useBudget();
  const { userData, updateUserProfile, signOut } = useAuth();
  const { expenses: allExpenses } = useExpenses();
  const { theme: currentTheme, actualTheme, setTheme } = useTheme();
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudget));
  const [apiKey, setApiKey] = useState(loadStoredApiKey);
  const [saved, setSaved] = useState(false);
  const { categories, deleteCategory, addCategory } = useCategories();
  const { savingsGoals, addSavingsGoal, deleteSavingsGoal } = useSavings();

  // Profile state
  const [profileName, setProfileName] = useState(userData?.name || "");
  const [profileBio, setProfileBio] = useState(userData?.bio || "");
  const [profileCurrency, setProfileCurrency] = useState(userData?.currency || "USD");
  const [profileTheme, setProfileTheme] = useState(userData?.theme || "system");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const { formatAmount } = useCurrency();

  const [activeTab, setActiveTab] = useState<"profile" | "categories" | "system">("profile");

  // New Category state
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("💰");
  const [newCatColor, setNewCatColor] = useState("#6366f1");

  // New Savings Goal state
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalIcon, setNewGoalIcon] = useState("🎯");
  const [newGoalColor, setNewGoalColor] = useState("#6366f1");

  useEffect(() => {
    if (userData) {
      setProfileName(userData.name);
      setProfileBio(userData.bio || "");
      setProfileCurrency(userData.currency || "USD");
      setProfileTheme(userData.theme || "system");
    }
  }, [userData]);

  // Sync profile theme with current theme
  useEffect(() => {
    setProfileTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    setBudgetInput(String(monthlyBudget));
  }, [monthlyBudget]);

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      await updateUserProfile({
        name: profileName,
        bio: profileBio,
        currency: profileCurrency,
        theme: profileTheme as "light" | "dark" | "system",
      });
      // Also update the theme context to ensure consistency
      setTheme(profileTheme as "light" | "dark" | "system");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await addCategory({
      name: newCatName.trim(),
      icon: newCatIcon,
      color: newCatColor,
    });
    setNewCatName("");
  };

  const handleAddGoal = async () => {
    if (!newGoalName.trim() || !newGoalTarget) return;
    await addSavingsGoal({
      name: newGoalName.trim(),
      targetAmount: parseFloat(newGoalTarget),
      type: "short-term",
      icon: newGoalIcon,
      color: newGoalColor,
      createdAt: new Date().toISOString(),
    });
    setNewGoalName("");
    setNewGoalTarget("");
  };

  const handleSaveApiKey = () => {
    saveApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exportToCSV = () => {
    const headers = ["Date", "Title", "Amount", "Category", "Payment Method"];
    const rows = allExpenses.map((e: Expense) => [
      e.date,
      e.note || e.merchant || "Expense",
      e.amount,
      categories.find((c) => c.id === e.categoryId)?.name || e.categoryId,
      e.paymentMethodType,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row: (string | number)[]) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "categories", label: "Categories", icon: SettingsIcon },
    { id: "system", label: "System", icon: Palette },
  ];

  const themes = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1 font-medium">Customize your SpendWise experience.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <aside className="w-full md:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "profile" | "categories" | "system")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-border">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-destructive hover:bg-destructive/10 transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Settings Content */}
        <div className="flex-1 space-y-8">
          {activeTab === "profile" && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-linear-to-tr from-primary to-primary/60 flex items-center justify-center text-3xl font-black text-primary-foreground shadow-xl ring-4 ring-background overflow-hidden">
                      {userData?.photoUrl ? (
                        <img
                          src={userData.photoUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        userData?.name?.charAt(0) || "U"
                      )}
                    </div>
                    <button className="absolute bottom-0 right-0 p-2 bg-background border border-border rounded-full shadow-lg hover:bg-accent transition-all">
                      <Camera className="h-4 w-4 text-foreground" />
                    </button>
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-black text-foreground">{userData?.name || "User"}</h3>
                    <p className="text-sm text-muted-foreground font-medium">{userData?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Preferred Currency
                    </label>
                    <select
                      value={profileCurrency}
                      onChange={(e) => setProfileCurrency(e.target.value)}
                      className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="PKR">PKR (₨)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Bio / Note
                    </label>
                    <textarea
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      rows={3}
                      className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none text-foreground"
                      placeholder="Tell us a bit about yourself..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                    Appearance
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          const newTheme = t.id as "light" | "dark" | "system";
                          setProfileTheme(newTheme);
                          setTheme(newTheme);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                          profileTheme === t.id
                            ? "bg-primary/10 border-primary text-primary shadow-sm"
                            : "bg-accent/30 border-border text-muted-foreground hover:border-muted-foreground/30",
                        )}
                      >
                        <t.icon className="h-6 w-6" />
                        <span className="text-xs font-black uppercase tracking-tighter">{t.label}</span>
                        {profileTheme === t.id && <div className="w-2 h-2 bg-primary rounded-full mt-1"></div>}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Current:{" "}
                    {currentTheme === "light"
                      ? "Light"
                      : currentTheme === "dark"
                        ? "Dark"
                        : "System (" + (actualTheme === "light" ? "Light" : "Dark") + ")"}
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isUpdatingProfile}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saved ? <Check className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                    {saved ? "Saved!" : "Save Changes"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === "system" && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6">
                <h3 className="text-xl font-black flex items-center gap-2 text-foreground">
                  <Palette className="h-6 w-6 text-primary" /> App Configuration
                </h3>

                <div className="space-y-2">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                    Monthly Budget ({profileCurrency})
                  </label>
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    onBlur={() => setMonthlyBudget(parseInt(budgetInput) || 0)}
                    className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                    OpenAI API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                    placeholder="sk-..."
                  />
                  <p className="text-[10px] text-muted-foreground font-medium px-1">
                    Used for smart receipt scanning and AI insights.
                  </p>
                </div>

                <div className="flex justify-end pt-4 gap-4">
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 bg-accent/30 text-foreground px-6 py-3 rounded-xl font-black border border-border hover:bg-accent/50 transition-all"
                  >
                    <Download className="h-5 w-5" />
                    Export CSV
                  </button>
                  <button
                    onClick={handleSaveApiKey}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                  >
                    {saved ? <Check className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                    Save Config
                  </button>
                </div>

                <div className="pt-8 border-t border-border space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-2 text-foreground">
                    <Target className="h-6 w-6 text-primary" /> Savings Goals
                  </h3>

                  {/* Add New Goal */}
                  <div className="bg-accent/20 rounded-2xl p-6 border border-border/50">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">
                      Create New Goal
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <input
                        type="text"
                        value={newGoalName}
                        onChange={(e) => setNewGoalName(e.target.value)}
                        placeholder="Goal Name (e.g. New Car)"
                        className="sm:col-span-2 bg-background border border-border rounded-xl px-4 py-2 font-bold text-sm"
                      />
                      <input
                        type="number"
                        value={newGoalTarget}
                        onChange={(e) => setNewGoalTarget(e.target.value)}
                        placeholder="Target Amount"
                        className="bg-background border border-border rounded-xl px-4 py-2 font-bold text-sm"
                      />
                      <button
                        onClick={handleAddGoal}
                        className="bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="h-4 w-4" /> Create
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">Icon</label>
                        <input
                          type="text"
                          value={newGoalIcon}
                          onChange={(e) => setNewGoalIcon(e.target.value)}
                          className="w-10 bg-background border border-border rounded-lg px-2 py-1 text-center"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">Color</label>
                        <input
                          type="color"
                          value={newGoalColor}
                          onChange={(e) => setNewGoalColor(e.target.value)}
                          className="flex-1 h-8 p-1 bg-background border border-border rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Goals List */}
                  <div className="grid grid-cols-1 gap-4">
                    {(savingsGoals ?? []).map((goal) => (
                      <div
                        key={goal.id}
                        className="flex items-center justify-between p-4 bg-accent/30 rounded-2xl border border-border group hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                            style={{ backgroundColor: goal.color + "20" }}
                          >
                            {goal.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <p className="font-bold text-sm text-foreground">{goal.name}</p>
                              <p className="text-xs font-black text-muted-foreground">
                                {formatAmount(goal.currentAmount)} / {formatAmount(goal.targetAmount)}
                              </p>
                            </div>
                            <div className="h-1.5 bg-background rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-1000"
                                style={{
                                  width: `${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%`,
                                  backgroundColor: goal.color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteSavingsGoal(goal.id)}
                          className="ml-4 p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "categories" && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                <h3 className="text-xl font-black flex items-center gap-2 mb-6 text-foreground">
                  <SettingsIcon className="h-6 w-6 text-primary" /> Manage Categories
                </h3>

                {/* Add New Category */}
                <div className="bg-accent/20 rounded-2xl p-6 mb-8 border border-border/50">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">
                    Add New Category
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Category Name"
                      className="sm:col-span-2 bg-background border border-border rounded-xl px-4 py-2 font-bold text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCatIcon}
                        onChange={(e) => setNewCatIcon(e.target.value)}
                        className="w-12 bg-background border border-border rounded-xl px-2 py-2 text-center"
                      />
                      <input
                        type="color"
                        value={newCatColor}
                        onChange={(e) => setNewCatColor(e.target.value)}
                        className="flex-1 h-10 p-1 bg-background border border-border rounded-xl cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={handleAddCategory}
                      className="bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-4 bg-accent/30 rounded-2xl border border-border group hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                          style={{ backgroundColor: c.color + "20" }}
                        >
                          {c.icon}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">
                            {c.isSystem ? "System Category" : "Custom Category"}
                          </p>
                        </div>
                      </div>
                      {!c.isSystem && (
                        <button
                          onClick={() => deleteCategory(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
