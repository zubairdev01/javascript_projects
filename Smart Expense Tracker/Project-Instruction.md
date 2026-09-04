Project: Smart Expense Tracker (with analytics + API)

Not just add/delete — build it to actually need the topics you learned, or it's a wasted exercise.

Core features & which topics they force you to use
Feature	JS topics exercised
Add/edit/delete expense (category, amount, date)	DOM creation/removal, event delegation, forms
Expense class with methods	OOP, this, class constructor
Category-wise totals & monthly summary	reduce, filter, map
"Budget alert" closure (warns when 80% of budget used)	Closures, lexical scoping
Currency converter (PKR → USD) using a free API	fetch, Promises, async/await
Save/load from localStorage	JSON.stringify/parse, JSON topic
Loading spinner while fetching	Async, DOM state toggling
Sort/search expenses	Higher-order array methods
Suggested 3-day breakdown

Day 1 — Structure + core CRUD

Expense class (constructor, id, category, amount, date)
ExpenseTracker class managing an array of expenses, with add(), delete(), edit()
Render list to DOM, event delegation for edit/delete buttons
Save to localStorage on every change

Day 2 — Analytics + closures

reduce() for total spend, filter() + reduce() for category totals
Closure-based budget checker: createBudgetMonitor(limit) returns a function that tracks running total and warns near/over limit
Simple bar/list-style category breakdown (no chart library needed — just styled divs)

Day 3 — API + polish

Free API call (e.g., exchangerate.host or similar) to show PKR equivalents in USD
Loading state, error handling (try/catch with fetch)
Search/sort UI, final styling, push to GitHub with a clean README
Why this beats a generic tutorial-clone project

