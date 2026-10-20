import React, { useState, useMemo } from 'react';
import {
  UtensilsCrossed,
  Trash2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  Wine,
  Flame,
  Salad,
  CakeSlice,
  Sparkles,
} from 'lucide-react';
import { Recipe, Ingredient } from '../types/index.js';
import { NewRecipeModal } from './NewRecipeModal.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { recipesApi } from '../api/client.js';

interface RecipesManagerViewProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  onRefresh: () => Promise<void>;
  hasAdminAccess: boolean;
  onFireTicket?: (recipeId: string, station: string) => Promise<void>;
}

export const RecipesManagerView: React.FC<RecipesManagerViewProps> = ({
  recipes = [],
  ingredients = [],
  onRefresh,
  hasAdminAccess,
  onFireTicket,
}) => {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [recipeIngredientsMap, setRecipeIngredientsMap] = useState<Record<string, any[]>>({});
  const [loadingBomId, setLoadingBomId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Extract unique stations/categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => {
      if (r.station) set.add(r.station);
    });
    return Array.from(set);
  }, [recipes]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const name = (r.name || r.menu_item_name || '').toLowerCase();
      const station = r.station || '';
      const matchesSearch = name.includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || station === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [recipes, selectedCategory, searchQuery]);

  // Fetch recipe ingredients on expand
  const toggleExpand = async (recipeId: string) => {
    if (expandedRecipeId === recipeId) {
      setExpandedRecipeId(null);
      return;
    }

    setExpandedRecipeId(recipeId);

    if (!recipeIngredientsMap[recipeId]) {
      setLoadingBomId(recipeId);
      try {
        const fullRecipe = await recipesApi.getById(recipeId);
        if (fullRecipe && fullRecipe.ingredients) {
          setRecipeIngredientsMap((prev) => ({
            ...prev,
            [recipeId]: fullRecipe.ingredients,
          }));
        }
      } catch (err) {
        console.error('Failed to load recipe ingredients', err);
      } finally {
        setLoadingBomId(null);
      }
    }
  };

  const handleCreateRecipe = async (data: {
    menu_item_name: string;
    station: string;
    price: number;
    prep_time_minutes: number;
    ingredients: Array<{
      ingredient_id?: string;
      name: string;
      unit: string;
      quantity_required: number;
      cost_per_unit?: number;
      current_stock?: number;
      minimum_threshold?: number;
    }>;
  }) => {
    await recipesApi.createWithIngredients({
      name: data.menu_item_name,
      station: data.station,
      price: data.price,
      prep_time_minutes: data.prep_time_minutes,
      ingredients: data.ingredients,
    });
    await onRefresh();
    setIsNewModalOpen(false);
  };

  const handleDeleteRecipe = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the menu?`)) return;
    setDeletingId(id);
    try {
      await recipesApi.delete(id);
      await onRefresh();
    } catch {
      alert('Failed to delete recipe');
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryIcon = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes('drink') || lower.includes('bar') || lower.includes('beverage')) {
      return <Wine className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
    }
    if (lower.includes('starter') || lower.includes('appetizer') || lower.includes('salad')) {
      return <Salad className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
    }
    if (lower.includes('dessert') || lower.includes('sweet')) {
      return <CakeSlice className="w-4 h-4 text-pink-500 dark:text-pink-400" />;
    }
    return <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-neu-surface rounded-2xl p-6 border border-neu-border shadow-neu-raised flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Menu & Recipes Catalog</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage dishes, drinks, starters, and their Bill of Materials (BOM) stock requirements
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {hasAdminAccess && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white text-xs font-semibold shadow-md flex items-center space-x-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Add Dish & Ingredients (AI / Manual)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer active:scale-95 ${
              selectedCategory === 'ALL'
                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky border border-sky-400/30'
                : 'bg-neu-surface text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-neu-border shadow-neu-raised-sm hover:shadow-neu-raised'
            }`}
          >
            <span>All Items ({recipes.length})</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer active:scale-95 ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-glow-purple border border-purple-400/40'
                  : 'bg-neu-surface text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-neu-border shadow-neu-raised-sm hover:shadow-neu-raised'
              }`}
            >
              {getCategoryIcon(cat)}
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dish or drink..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle text-slate-900 dark:text-white text-xs placeholder-slate-400 shadow-neu-inset-sm focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Menu Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map((recipe) => {
          const isExpanded = expandedRecipeId === recipe.id;
          const bomList = recipeIngredientsMap[recipe.id] || [];
          const isLoadingBom = loadingBomId === recipe.id;
          const recipeName = recipe.menu_item_name || recipe.name || 'Unnamed Dish';

          return (
            <div
              key={recipe.id}
              className="bg-neu-card rounded-2xl p-5 border border-neu-border shadow-neu-raised-sm hover:shadow-neu-raised flex flex-col justify-between transition-all"
            >
              <div>
                {/* Station Tag & Price */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className="px-2.5 py-1 rounded-lg bg-neu-sunken border border-neu-borderSubtle text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 shadow-neu-inset-sm">
                    {getCategoryIcon(recipe.station)}
                    <span>{recipe.station}</span>
                  </span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    ${Number(recipe.sale_price ?? recipe.price ?? 0).toFixed(2)}
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                  {recipeName}
                </h3>

                {/* Prep Time */}
                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mb-4 font-mono">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{recipe.prep_time_minutes || 15}m prep</span>
                  </span>
                </div>

                {/* BOM Collapsible Details */}
                <div className="pt-3 border-t border-neu-borderSubtle">
                  <button
                    onClick={() => toggleExpand(recipe.id)}
                    className="w-full flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 hover:underline transition-colors font-semibold cursor-pointer"
                  >
                    <span className="flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-500" />
                      <span>Required Ingredients (BOM)</span>
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-3 rounded-xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm space-y-2 animate-fade-in text-xs">
                      {isLoadingBom ? (
                        <p className="text-slate-400 text-xs italic">Loading bill of materials...</p>
                      ) : bomList.length === 0 ? (
                        <p className="text-slate-500 text-xs italic">
                          No ingredients linked. Tap edit to attach stock.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {bomList.map((ing, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-[11px] font-mono text-slate-700 dark:text-slate-300 py-0.5 border-b border-neu-borderSubtle last:border-0"
                            >
                              <span>{ing.ingredient_name || ing.name}</span>
                              <span className="text-purple-600 dark:text-purple-300 font-semibold">
                                {ing.quantity_required} {ing.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-neu-borderSubtle flex items-center justify-between">
                {onFireTicket && (
                  <button
                    onClick={() => onFireTicket(recipe.id, recipe.station)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Fire KDS Ticket</span>
                  </button>
                )}

                {hasAdminAccess && (
                  <button
                    disabled={deletingId === recipe.id}
                    onClick={() => handleDeleteRecipe(recipe.id, recipeName)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-auto cursor-pointer"
                    title="Delete dish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Recipe Modal */}
      <ErrorBoundary fallbackTitle="Dish & Recipe Builder Error">
        <NewRecipeModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          ingredients={ingredients}
          onSubmit={handleCreateRecipe}
        />
      </ErrorBoundary>
    </div>
  );
};
