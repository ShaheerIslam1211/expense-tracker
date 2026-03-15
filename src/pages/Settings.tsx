import { useState, useEffect, useMemo, useRef, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
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
  SlidersHorizontal,
  RotateCcw,
  WandSparkles,
  Upload,
  Download as DownloadIcon,
} from "lucide-react";
import { cn } from "../utils/cn";
import { useCurrency } from "../hooks/useCurrency";
import type { Expense } from "../types";
import { useAppSettings } from "../context/AppSettingsContext";
import { useSensitiveMode } from "../hooks/useSensitiveMode";
import { resizeDataUrl } from "../utils/imageResize";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { useModalBehavior } from "../hooks/useModalBehavior";

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

function toCountryCode(input?: string): CountryCode | "" {
  if (!input) return "";
  const normalized = input.trim().toUpperCase();
  if (normalized.length === 2 && /^[A-Z]{2}$/.test(normalized)) {
    return normalized as CountryCode;
  }
  return "";
}

async function getCroppedDataUrl(imageSrc: string, cropAreaPixels: Area): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for crop"));
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = cropAreaPixels.width;
  canvas.height = cropAreaPixels.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  ctx.drawImage(
    image,
    cropAreaPixels.x,
    cropAreaPixels.y,
    cropAreaPixels.width,
    cropAreaPixels.height,
    0,
    0,
    cropAreaPixels.width,
    cropAreaPixels.height,
  );

  return canvas.toDataURL("image/jpeg", 0.9);
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
  const { settings, updateSettings, resetSettings, applyPreset, exportSettings, importSettings } = useAppSettings();
  const { hideSensitiveValues, toggleSensitiveValues } = useSensitiveMode();

  // Profile state
  const [profileName, setProfileName] = useState(userData?.name || "");
  const [profileBio, setProfileBio] = useState(userData?.bio || "");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(userData?.photoUrl || "");
  const [profilePhone, setProfilePhone] = useState(userData?.phone || "");
  const [profileCountry, setProfileCountry] = useState<CountryCode | "">(toCountryCode(userData?.country));
  const [profileTimezone, setProfileTimezone] = useState(
    userData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [profileCompanyName, setProfileCompanyName] = useState(userData?.companyName || "");
  const [profileCompanyRole, setProfileCompanyRole] = useState(userData?.companyRole || "");
  const [profileCompanyLinked, setProfileCompanyLinked] = useState(Boolean(userData?.isCompanyLinked));
  const [profileCurrency, setProfileCurrency] = useState(userData?.currency || "USD");
  const [profileTheme, setProfileTheme] = useState(userData?.theme || "system");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.2);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
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
  const [advancedSaved, setAdvancedSaved] = useState(false);
  const settingsImportRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const closeCropEditor = () => {
    setIsCropModalOpen(false);
    setCropImageSrc("");
    setCroppedAreaPixels(null);
  };
  useModalBehavior(isCropModalOpen, closeCropEditor);

  const countryDisplayNames = useMemo(() => new Intl.DisplayNames(["en"], { type: "region" }), []);
  const countryOptions = useMemo(
    () =>
      getCountries()
        .map((code) => ({
          code,
          name: countryDisplayNames.of(code) ?? code,
          dialCode: `+${getCountryCallingCode(code)}`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [countryDisplayNames],
  );
  const dialCodeByCountry = useMemo(
    () =>
      Object.fromEntries(countryOptions.map((country) => [country.code, country.dialCode])) as Record<
        CountryCode,
        string
      >,
    [countryOptions],
  );
  const countryCodeByName = useMemo(
    () =>
      Object.fromEntries(countryOptions.map((country) => [country.name.toLowerCase(), country.code])) as Record<
        string,
        CountryCode
      >,
    [countryOptions],
  );
  const selectedDialCode = profileCountry ? dialCodeByCountry[profileCountry] : "";
  const profileCompletion = useMemo(() => {
    const checks = [
      profileName.trim().length > 0,
      profilePhotoUrl.trim().length > 0,
      profilePhone.trim().length > 0,
      Boolean(profileCountry),
      profileTimezone.trim().length > 0,
      profileBio.trim().length > 0,
      profileCompanyLinked ? profileCompanyName.trim().length > 0 : true,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [
    profileName,
    profilePhotoUrl,
    profilePhone,
    profileCountry,
    profileTimezone,
    profileBio,
    profileCompanyLinked,
    profileCompanyName,
  ]);

  useEffect(() => {
    if (userData) {
      setProfileName(userData.name);
      setProfileBio(userData.bio || "");
      setProfilePhotoUrl(userData.photoUrl || "");
      setProfilePhone(userData.phone || "");
      const parsedCode = toCountryCode(userData.country);
      const nameLookup = userData.country ? countryCodeByName[userData.country.toLowerCase()] : "";
      setProfileCountry(parsedCode || nameLookup || "");
      setProfileTimezone(userData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setProfileCompanyName(userData.companyName || "");
      setProfileCompanyRole(userData.companyRole || "");
      setProfileCompanyLinked(Boolean(userData.isCompanyLinked));
      setProfileCurrency(userData.currency || "USD");
      setProfileTheme(userData.theme || "system");
    }
  }, [userData, countryCodeByName]);

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
        photoUrl: profilePhotoUrl.trim(),
        phone: profilePhone.trim() || undefined,
        country: profileCountry || undefined,
        timezone: profileTimezone.trim() || undefined,
        isCompanyLinked: profileCompanyLinked,
        companyName: profileCompanyLinked ? profileCompanyName.trim() || undefined : undefined,
        companyRole: profileCompanyLinked ? profileCompanyRole.trim() || undefined : undefined,
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

  const applyDialCodeToPhone = (phoneValue: string, nextDialCode: string) => {
    if (!nextDialCode) return phoneValue;
    const trimmed = phoneValue.trim();
    if (!trimmed) return `${nextDialCode} `;
    if (!trimmed.startsWith("+")) return `${nextDialCode} ${trimmed}`;
    const withoutPrefix = trimmed.replace(/^\+\d+\s*/, "").trimStart();
    return `${nextDialCode} ${withoutPrefix}`.trimEnd();
  };

  const handleCountryChange = (countryCode: CountryCode | "") => {
    setProfileCountry(countryCode);
    const nextDialCode = countryCode ? dialCodeByCountry[countryCode] : "";
    setProfilePhone((prev) => applyDialCodeToPhone(prev, nextDialCode));
  };

  const handleProfilePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploadError("");
    try {
      const rawImage = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(file);
      });
      setCropImageSrc(rawImage);
      setCrop({ x: 0, y: 0 });
      setZoom(1.2);
      setCroppedAreaPixels(null);
      setIsCropModalOpen(true);
    } catch (error) {
      console.error("Failed to upload profile photo:", error);
      setPhotoUploadError("Unable to process image. Please try another photo.");
    }
    e.target.value = "";
  };

  const handleConfirmCroppedPhoto = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    setIsUploadingPhoto(true);
    setPhotoUploadError("");
    try {
      const cropped = await getCroppedDataUrl(cropImageSrc, croppedAreaPixels);
      const optimized = await resizeDataUrl(cropped, 350 * 1024, 600, 0.82);
      setProfilePhotoUrl(optimized);
      closeCropEditor();
    } catch (error) {
      console.error("Failed to finalize cropped image:", error);
      setPhotoUploadError("Unable to finalize crop. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleUseDeviceLocale = () => {
    const region = navigator.language.split("-")[1];
    const nextCountry = toCountryCode(region);
    if (nextCountry) {
      handleCountryChange(nextCountry);
    }
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (deviceTimezone) setProfileTimezone(deviceTimezone);
  };

  const handleSaveAdvancedSettings = () => {
    setAdvancedSaved(true);
    setTimeout(() => setAdvancedSaved(false), 2000);
  };

  const handleExportAdvancedSettings = () => {
    const content = exportSettings();
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spendwise-settings.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportAdvancedSettings = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const ok = importSettings(text);
      if (ok) {
        setAdvancedSaved(true);
        setTimeout(() => setAdvancedSaved(false), 2000);
      }
    } catch {
      // ignore malformed import
    } finally {
      e.target.value = "";
    }
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
                <div className="bg-accent/20 border border-border/60 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Profile Completion
                    </p>
                    <p className="text-sm font-black text-foreground">{profileCompletion}%</p>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-background overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-linear-to-tr from-primary to-primary/60 flex items-center justify-center text-3xl font-black text-primary-foreground shadow-xl ring-4 ring-background overflow-hidden">
                      {profilePhotoUrl ? (
                        <img
                          src={profilePhotoUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          onError={() => setProfilePhotoUrl("")}
                        />
                      ) : (
                        profileName?.charAt(0)?.toUpperCase() || "U"
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 p-2 bg-background border border-border rounded-full shadow-lg">
                      <Camera className="h-4 w-4 text-foreground" />
                    </span>
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-black text-foreground">{profileName || "User"}</h3>
                    <p className="text-sm text-muted-foreground font-medium">{userData?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profileCompanyLinked && profileCompanyName
                        ? `${profileCompanyName} - ${profileCompanyRole || "Member"}`
                        : "Personal profile"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                      <input
                        ref={profilePhotoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfilePhotoUpload}
                      />
                      <button
                        type="button"
                        onClick={() => profilePhotoInputRef.current?.click()}
                        className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg border border-border bg-accent/30 hover:bg-accent/50 transition-all"
                        disabled={isUploadingPhoto}
                      >
                        {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfilePhotoUrl("")}
                        className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg border border-border bg-accent/30 hover:bg-accent/50 transition-all"
                      >
                        Remove Photo
                      </button>
                    </div>
                    {photoUploadError && <p className="text-[11px] text-destructive mt-2">{photoUploadError}</p>}
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
                      Profile Photo URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={profilePhotoUrl}
                      onChange={(e) => setProfilePhotoUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder={selectedDialCode ? `${selectedDialCode} 555 123 4567` : "+1 555 123 4567"}
                      className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                    />
                    <p className="text-[10px] text-muted-foreground px-1">
                      Country code updates automatically when you change country.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Country
                    </label>
                    <select
                      value={profileCountry}
                      onChange={(e) => handleCountryChange(e.target.value as CountryCode | "")}
                      className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                    >
                      <option value="">Select Country</option>
                      {countryOptions.map((country) => (
                        <option
                          key={country.code}
                          value={country.code}
                        >
                          {country.name} ({country.dialCode})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleUseDeviceLocale}
                      className="mt-1 text-[10px] font-black uppercase tracking-wider text-primary hover:underline"
                    >
                      Use Device Locale
                    </button>
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Timezone
                    </label>
                    <input
                      type="text"
                      value={profileTimezone}
                      onChange={(e) => setProfileTimezone(e.target.value)}
                      placeholder="Asia/Karachi"
                      className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                    />
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

                <div className="space-y-4 border-t border-border pt-6">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Company Profile Link
                    </label>
                    <button
                      type="button"
                      onClick={() => setProfileCompanyLinked((prev) => !prev)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest border transition-all",
                        profileCompanyLinked
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-accent/30 border-border text-muted-foreground",
                      )}
                    >
                      {profileCompanyLinked ? "Linked" : "Unlinked"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={profileCompanyName}
                        onChange={(e) => setProfileCompanyName(e.target.value)}
                        placeholder="Acme Finance Ltd."
                        disabled={!profileCompanyLinked}
                        className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                        Role / Title
                      </label>
                      <input
                        type="text"
                        value={profileCompanyRole}
                        onChange={(e) => setProfileCompanyRole(e.target.value)}
                        placeholder="Finance Manager"
                        disabled={!profileCompanyLinked}
                        className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground disabled:opacity-60"
                      />
                    </div>
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
                    <DownloadIcon className="h-5 w-5" />
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

                <div className="pt-8 border-t border-border space-y-5">
                  <h3 className="text-xl font-black flex items-center gap-2 text-foreground">
                    <SlidersHorizontal className="h-6 w-6 text-primary" /> Advanced Preferences
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => applyPreset("balanced")}
                      className="px-4 py-3 rounded-xl border border-border bg-accent/20 hover:bg-accent/40 text-xs font-black uppercase tracking-widest text-foreground"
                    >
                      Preset: Balanced
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("power")}
                      className="px-4 py-3 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-xs font-black uppercase tracking-widest text-primary"
                    >
                      Preset: Power User
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("minimal")}
                      className="px-4 py-3 rounded-xl border border-border bg-accent/20 hover:bg-accent/40 text-xs font-black uppercase tracking-widest text-foreground"
                    >
                      Preset: Minimal
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                        Default Transaction Type
                      </label>
                      <select
                        value={settings.defaultTransactionType}
                        onChange={(e) =>
                          updateSettings({ defaultTransactionType: e.target.value as "expense" | "income" })
                        }
                        className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold text-foreground"
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                        Default Payment Method
                      </label>
                      <select
                        value={settings.defaultPaymentMethodType}
                        onChange={(e) =>
                          updateSettings({ defaultPaymentMethodType: e.target.value as "cash" | "card" })
                        }
                        className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold text-foreground"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                        Calendar Week Start
                      </label>
                      <select
                        value={settings.weekStartsOnMonday ? "monday" : "sunday"}
                        onChange={(e) => updateSettings({ weekStartsOnMonday: e.target.value === "monday" })}
                        className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold text-foreground"
                      >
                        <option value="sunday">Sunday</option>
                        <option value="monday">Monday</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                        Number Display
                      </label>
                      <select
                        value={settings.compactNumberFormatting ? "compact" : "full"}
                        onChange={(e) => updateSettings({ compactNumberFormatting: e.target.value === "compact" })}
                        className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 font-bold text-foreground"
                      >
                        <option value="full">Full (1,245,000)</option>
                        <option value="compact">Compact (1.2M)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => updateSettings({ autoScanReceiptOnUpload: !settings.autoScanReceiptOnUpload })}
                      className={cn(
                        "px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all",
                        settings.autoScanReceiptOnUpload
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-accent/30 border-border text-muted-foreground",
                      )}
                    >
                      Auto Scan Upload: {settings.autoScanReceiptOnUpload ? "On" : "Off"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
                      className={cn(
                        "px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all",
                        settings.reducedMotion
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-accent/30 border-border text-muted-foreground",
                      )}
                    >
                      Reduced Motion: {settings.reducedMotion ? "On" : "Off"}
                    </button>
                    <button
                      type="button"
                      onClick={toggleSensitiveValues}
                      className={cn(
                        "px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all",
                        hideSensitiveValues
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-accent/30 border-border text-muted-foreground",
                      )}
                    >
                      Privacy Mode: {hideSensitiveValues ? "On" : "Off"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => updateSettings({ mobileNavbarFixed: !settings.mobileNavbarFixed })}
                      className={cn(
                        "px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all",
                        settings.mobileNavbarFixed
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-accent/30 border-border text-muted-foreground",
                      )}
                    >
                      Mobile Navbar: {settings.mobileNavbarFixed ? "Fixed" : "Unfixed"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSettings({ showFloatingAddButton: !settings.showFloatingAddButton })}
                      className={cn(
                        "px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all",
                        settings.showFloatingAddButton
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-accent/30 border-border text-muted-foreground",
                      )}
                    >
                      Floating Add: {settings.showFloatingAddButton ? "On" : "Off"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSettings({ showPwaInstallPrompt: !settings.showPwaInstallPrompt })}
                      className={cn(
                        "px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all",
                        settings.showPwaInstallPrompt
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-accent/30 border-border text-muted-foreground",
                      )}
                    >
                      PWA Prompt: {settings.showPwaInstallPrompt ? "On" : "Off"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateSettings({ showSidebarTipCard: !settings.showSidebarTipCard })}
                      className={cn(
                        "px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all",
                        settings.showSidebarTipCard
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-accent/30 border-border text-muted-foreground",
                      )}
                    >
                      Sidebar Tips: {settings.showSidebarTipCard ? "On" : "Off"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSettings({ compactLayout: !settings.compactLayout })}
                      className={cn(
                        "px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all",
                        settings.compactLayout
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-accent/30 border-border text-muted-foreground",
                      )}
                    >
                      Compact Layout: {settings.compactLayout ? "On" : "Off"}
                    </button>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 pt-1">
                    <input
                      ref={settingsImportRef}
                      type="file"
                      accept="application/json,.json"
                      onChange={handleImportAdvancedSettings}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={handleExportAdvancedSettings}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border font-black text-xs uppercase tracking-widest hover:bg-accent transition-all"
                    >
                      <DownloadIcon className="h-4 w-4" />
                      Export Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => settingsImportRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border font-black text-xs uppercase tracking-widest hover:bg-accent transition-all"
                    >
                      <Upload className="h-4 w-4" />
                      Import Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetSettings();
                        setAdvancedSaved(false);
                      }}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border font-black text-xs uppercase tracking-widest hover:bg-accent transition-all"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Advanced
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAdvancedSettings}
                      className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                    >
                      {advancedSaved ? <Check className="h-5 w-5" /> : <WandSparkles className="h-5 w-5" />}
                      {advancedSaved ? "Saved!" : "Save Advanced"}
                    </button>
                  </div>
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

      {isCropModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-70 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
            onClick={closeCropEditor}
          >
            <div
              className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Adjust Profile Photo</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag to reposition and use zoom for perfect framing.
                </p>
              </div>

              <div className="relative h-[52vh] min-h-[280px] bg-black">
                <Cropper
                  image={cropImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  objectFit="contain"
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                />
              </div>

              <div className="px-4 py-4 border-t border-border space-y-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Zoom</label>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeCropEditor}
                    className="px-4 py-2 rounded-lg border border-border bg-accent/30 text-foreground text-xs font-black uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCroppedPhoto}
                    disabled={isUploadingPhoto || !croppedAreaPixels}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider disabled:opacity-60"
                  >
                    {isUploadingPhoto ? "Saving..." : "Apply Crop"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
