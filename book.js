const recipeTabs = Array.from(document.querySelectorAll('.tabs [data-pick]'));
const pageImage = document.getElementById('book-page');
const previewLinks = ['read-recipe', 'page-open'].map(id => document.getElementById(id));
const currentRecipe = document.getElementById('current-recipe');
const recipeDialog = document.getElementById('recipe-dialog');
let selected = recipeTabs.find(tab => tab.getAttribute('aria-pressed') === 'true').dataset.pick;

function showRecipe(key) {
  const recipe = sampleRecipes[key];
  if (!recipe) return;
  selected = key;
  const imageUrl = 'assets/page-' + key + '.webp';
  pageImage.src = imageUrl;
  pageImage.alt = 'Страница книги. ' + recipe.title;
  currentRecipe.textContent = recipe.title;
  previewLinks.forEach(link => { link.href = imageUrl; });
  previewLinks[1].setAttribute('aria-label', 'Читать рецепт. ' + recipe.title);
  recipeTabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.pick === key)));
}

document.querySelectorAll('[data-pick]').forEach(control => {
  control.addEventListener('click', () => showRecipe(control.dataset.pick));
});

function fillRecipeList(id, entries) {
  const items = entries.map(entry => {
    const li = document.createElement('li');
    li.textContent = entry;
    return li;
  });
  document.getElementById(id).replaceChildren(...items);
}

const recipeLinks = [...previewLinks, ...document.querySelectorAll('[data-read]')];

for (const link of recipeLinks) {
  link.addEventListener('click', event => {
    if (typeof recipeDialog.showModal !== 'function' || event.ctrlKey || event.metaKey ||
        event.shiftKey || event.altKey) return;
    event.preventDefault();
    const recipe = sampleRecipes[link.dataset.read || selected];
    document.getElementById('dialog-title').textContent = recipe.title;
    document.getElementById('dialog-meta').textContent = [recipe.portions, 'Всего ' + recipe.time, 'Активно ' + recipe.active].join(' · ');
    document.getElementById('dialog-nutrition').textContent = recipe.nutrition;
    document.getElementById('dialog-equipment').textContent = 'Посуда. ' + recipe.equipment;
    const tip = document.getElementById('dialog-tip');
    tip.textContent = recipe.tip;
    tip.hidden = !recipe.tip;
    fillRecipeList('dialog-ingredients', recipe.ingredients);
    fillRecipeList('dialog-steps', recipe.steps);
    recipeDialog.showModal();
    recipeDialog.scrollTop = 0;
  });
}

document.querySelector('.dialog-book').addEventListener('click', () => recipeDialog.close());
