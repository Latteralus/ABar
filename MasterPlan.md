# Master Development Prompt: Real-Time Bar Management Sandbox

## 1. Project Role

Act as the lead game designer, simulation architect, senior TypeScript developer, database designer, UI/UX designer, and testing engineer for a serious browser-based business management game.

The game is a realistic, spreadsheet-style management sandbox centered on owning and operating one bar.

The experience should feel closer to **Wall Street Raider** than a conventional restaurant tycoon game. The player should manage the business through data, reports, operational tables, financial statements, and policy decisions rather than moving characters or designing rooms.

The player has no missions, quests, objectives, achievements, campaign, or formal win condition. The player simply exists in the simulated world and attempts to build, improve, and operate the bar.

The player may succeed, stagnate, lose money, recover, or become bankrupt.

The project must be built incrementally, beginning with a playable vertical slice. Do not attempt to implement every system simultaneously.

---

# 2. Technology Requirements

Use the following stack:

* TypeScript
* React
* Vite
* Supabase-ready architecture
* Local storage for initial save persistence
* Desktop browser support
* No mobile support required initially
* No external AI API
* No generative AI service
* No multiplayer
* No modding support
* No offline progression

Supabase will eventually be used for persistent accounts and cloud saves, but the first implementation should use local storage.

The simulation must stop when the browser is closed or the game is paused.

---

# 3. Engineering Standards

The game must be highly modular.

Do not create massive files containing unrelated systems.

Separate the project into focused modules, including:

* Simulation clock
* Customer generation
* Customer behavior
* Employee behavior
* Drink preparation
* Food preparation
* Inventory
* Purchasing
* Deliveries
* Transactions
* Financial accounting
* Equipment
* Maintenance
* Advertising
* Reputation
* Competition
* Save management
* UI state
* Game configuration
* Static content
* Random generation
* Event logging

Use clear interfaces and typed models.

Game systems should communicate through defined events, services, or state actions instead of directly modifying unrelated state.

Avoid tightly coupling simulation logic to React components.

React components should display state and issue player commands. They should not contain core simulation calculations.

Use configuration files for values that designers may want to edit later, including:

* Product prices
* Product recipes
* Equipment statistics
* Employee skill ranges
* Customer archetypes
* Advertising effects
* Property values
* Operating costs
* Demand patterns
* Reputation effects
* Competitor generation
* Loan terms
* Bankruptcy rules

Do not hardcode balancing values throughout the application.

---

# 4. Core Game Concept

The player operates one predetermined starter bar.

The starter business is a small, low-capacity dive bar.

The player begins with:

* $5,000 cash
* Access to an optional $10,000 startup loan
* A basic bar property
* Minimal equipment
* Limited seating
* Limited storage
* A small initial menu
* No manager
* No automatic inventory minimum system unless a manager is later hired

The player may either:

* Purchase the property for one flat price
* Lease the property for a recurring monthly payment

The property information should include:

* Purchase price
* Lease price
* Customer capacity
* Seating capacity
* Storage capacity
* Neighborhood characteristics
* Typical customer demographics
* Nearby competition
* Existing equipment
* Available upgrades

The first version only needs one predetermined property, but the data model should support additional properties later.

---

# 5. Gameplay Philosophy

The game should be realistic but not tedious.

The player manages:

* Hiring
* Staffing
* Employee quality
* Menu selection
* Product pricing
* Inventory
* Purchasing
* Reorder policies
* Equipment
* Maintenance
* Advertising
* Promotions
* Cash management
* Financial statements
* Debt
* Bills
* Service quality
* Business reputation

Employees should perform the actual operational tasks.

The player should not manually:

* Pour drinks
* Cook food
* Seat customers
* Clean tables
* Deliver individual orders
* Process each payment

The player makes business decisions and watches the simulation operate.

Bad decisions should be allowed.

Do not prevent the player from opening because the bar is understaffed, understocked, unclean, or unprepared.

The consequences should emerge naturally through poor service, lost customers, reduced reputation, lower revenue, or bankruptcy.

---

# 6. Time System

The simulation uses a fixed ratio:

* 1 real-world second equals 1 in-game minute
* 60 real-world seconds equals 1 in-game hour
* One 12-hour operating day takes 12 real-world minutes

The bar operates from:

* 2:00 p.m.
* Until 2:00 a.m.

The game must support:

* Pause
* Resume
* Normal speed only

Do not add time acceleration initially.

The game does not advance while:

* Paused
* Browser is closed
* Save is not loaded

At the end of each operating day:

1. The bar closes.
2. Remaining customers leave or complete their final checkout.
3. Daily reports are generated.
4. The player enters a between-day management phase.
5. The player may review reports.
6. The player may hire employees.
7. The player may purchase supplies.
8. The player may change prices.
9. The player may change menu offerings.
10. The player may repair or buy equipment.
11. The player may purchase advertising.
12. The player may review finances.
13. The player may manually begin the next day.
14. The player may enable automatic opening.

The player may manually open the next day regardless of readiness.

---

# 7. Weekly Financial Cycle

Sunday is the primary billing day.

The following obligations become due on Sundays:

* Employee wages
* Utilities
* Water
* Electricity
* Lease payments
* Rent-related obligations
* Supply tabs
* Loan payments
* Licensing costs where applicable
* Other recurring expenses

The player may pay bills early.

The game should maintain:

* Outstanding bills
* Paid bills
* Due dates
* Overdue amounts
* Weekly totals
* Historical payment records

When the player’s cash balance becomes negative:

* Start a seven-day insolvency countdown.
* Clearly display the number of remaining days.
* The player may continue operating during this period.
* If the player restores the cash balance to zero or above, cancel the countdown.
* If the player remains negative when the seven-day period expires, declare bankruptcy and end the save.

---

# 8. Opening and Closing

The player may:

* Press an Open Bar button manually
* Enable automatic daily opening

Automatic opening should open the bar at 2:00 p.m. after the between-day phase.

Do not require:

* Minimum inventory
* Minimum staff
* Working equipment
* Positive cash
* Any other readiness condition

The bar closes automatically at 2:00 a.m.

---

# 9. Customer Simulation

Every customer should be an individually simulated entity.

Each customer should have:

* Generated first name
* Generated last name
* Age group
* Income level
* Spending budget
* Drink preferences
* Food preferences
* Price sensitivity
* Patience
* Service expectations
* Review tendency
* Intoxication level
* Satisfaction
* Group membership
* Arrival time
* Current status
* Current location or service area
* Open tab
* Purchase history for the visit
* Likelihood of ordering another item

Use separate static name files or name-generation data containing first and last names.

Customers may arrive:

* Alone
* As couples
* In small groups
* In larger parties

Singles should remain common.

Customer arrival should be influenced by:

* Time of day
* Day of week
* Advertising
* Active promotions
* Service reputation
* Drink prices
* Food prices
* Seating capacity
* Current occupancy
* Bar concept
* Neighborhood demand
* Customer demographics
* Nearby competition
* Product availability
* Recent customer reviews
* General market trends

Customers should follow a lifecycle similar to:

1. Generated
2. Decides whether to visit
3. Arrives
4. Waits to enter if necessary
5. Finds an open seating slot
6. Waits for service
7. Places an order
8. Waits for preparation
9. Receives order
10. Consumes product
11. May place another order
12. Requests checkout
13. Pays tab
14. Leaves
15. Generates satisfaction outcome
16. May generate a review

Customers may leave early because:

* No seating is available
* Wait time is too long
* Prices are too high
* Preferred items are unavailable
* Cleanliness is poor
* Service is poor
* The bar is overcrowded
* The customer becomes dissatisfied
* Closing time approaches

---

# 10. Seating and Capacity

The bar does not use a visual floor-plan editor.

Capacity is represented through numerical slots.

The property should have:

* Maximum occupancy
* Customer seating slots
* Bar seating slots
* Table seating slots where applicable
* Standing capacity if later enabled

For the initial version, seating determines the number of customers who may remain inside.

Interior improvements should be represented through individual equipment and capacity upgrades.

The player should use imagination rather than directly designing the room.

---

# 11. Customer Intoxication and Removal

Each alcoholic drink should increase customer intoxication.

Intoxication should affect:

* Probability of ordering more
* Patience
* Spending
* Satisfaction
* Behavior
* Likelihood of needing removal
* Ability to remain in the bar

Employees should stop serving customers who exceed service limits.

An intoxicated customer may:

* Cooperate and leave
* Refuse to leave
* Require security intervention
* Require police intervention

If security is employed:

* Security should attempt to remove the customer.

If no security employee is available:

* A bartender may request that the customer leave.
* If the customer refuses, the bartender may call the police.

This should appear in the live operational log.

Do not turn this into a detailed crime or legal simulation.

---

# 12. Products and Menu

The initial product catalog should include:

* Basic soft drinks
* Bottled beer
* Basic liquor
* Simple mixed drinks
* Basic food items

The player may:

* Choose which existing products are offered
* Set the selling price of each product
* Temporarily remove an item from the menu
* View product cost
* View estimated gross profit
* View recent sales
* View inventory requirements
* View preparation time
* View popularity
* View customer demand

The player may not:

* Create custom drink recipes
* Create custom food recipes
* Edit ingredients manually
* Design entirely new products

Recipes should be predefined in configuration data.

---

# 13. Drink Recipes and Inventory Consumption

Drinks must consume exact inventory quantities.

Example:

A rum and cola may consume:

* 1.5 ounces of rum
* One cola serving
* One ice serving
* One garnish serving

All recipes should clearly define:

* Required ingredients
* Required quantities
* Preparation time
* Required employee role
* Required equipment
* Base quality
* Base selling-price suggestion

Employee skill should affect inventory efficiency.

A low-skilled bartender may:

* Over-pour liquor
* Waste mixer
* Spill ingredients
* Prepare more slowly
* Make lower-quality drinks
* Reduce profit margin

A highly skilled bartender should:

* Pour more accurately
* Work faster
* Waste less inventory
* Improve customer satisfaction
* Handle more customers
* Earn more tips

Do not make low skill create impossible results. It should create gradually worse efficiency and quality.

---

# 14. Food Preparation

Food should use predefined recipes with individual ingredients.

Example burger recipe:

* One burger patty
* Two bun portions
* Ketchup
* Tomato
* Other configured ingredients

Food preparation should require:

* A cook
* Required ingredients
* Required equipment
* Preparation time
* Available service capacity

Food should not be represented solely as a finished boxed product.

The player chooses menu items but does not design recipes.

---

# 15. Inventory

Inventory should use realistic units where appropriate:

* Bottles
* Cases
* Kegs
* Ounces
* Fluid ounces
* Servings
* Pounds
* Individual units
* Ingredient portions

Every inventory item should track:

* Name
* Category
* Quantity
* Unit type
* Average purchase cost
* Current value
* Storage requirement
* Storage location
* Spoilage status
* Shelf life
* Refrigeration requirement
* Freezer requirement
* Reorder minimum
* Pending delivery quantity
* Recent usage
* Estimated days remaining

Inventory may be stored in:

* General storage
* Refrigerated storage
* Frozen storage
* Bar stock
* Kitchen stock

Storage capacity must matter.

---

# 16. Spoilage

Perishable products should spoil over time.

Shelf life should be substantially extended when properly stored in:

* Refrigerators
* Freezers

Improper storage should:

* Shorten shelf life
* Increase waste
* Potentially prevent an item from being used

Spoiled items should be removed from usable inventory and recorded as waste.

The player should be able to review:

* Spoiled product
* Quantity lost
* Financial value lost
* Cause
* Date

---

# 17. Purchasing and Deliveries

The player may place supply orders during the between-day management phase.

Orders placed after a day closes should arrive at:

* 2:00 p.m. at the beginning of the following operating day

The initial version does not require multiple supplier types.

Use one standard supplier system initially.

Each purchase order should show:

* Order number
* Order date
* Expected delivery date
* Item
* Quantity
* Unit cost
* Total cost
* Payment status
* Delivery status

The game should support supply tabs, allowing some orders to become weekly payable obligations rather than immediate cash payments.

---

# 18. Automatic Reordering

Automatic reorder minimums should initially require a manager.

Once a manager is hired in a later phase, the player may set:

* Minimum quantity
* Target quantity
* Maximum order spending
* Whether the item may be reordered automatically

However, manager automation is not required in the first vertical slice.

Build the inventory model so this feature can be added without redesigning the system.

---

# 19. Employees

Every employee should be an individually generated entity.

Each employee should have:

* First name
* Last name
* Role
* Wage
* Experience
* Personality
* Employment date
* Number of shifts worked
* Current task
* Current status
* Performance statistics
* Skill progression
* Historical sales or service output where appropriate

Initial employee roles may include:

* Bartender
* Server
* Cook
* Host
* Dishwasher
* Barback
* Security
* Maintenance worker

Manager should be supported by the architecture but does not need to be fully implemented in the first version.

---

# 20. Employee Skills

Use the following general skill categories:

* Bartending
* Serving
* Cooking
* Speed
* Accuracy
* Charisma
* Cleanliness
* Security
* Management
* Experience

Employees should have:

* General skills
* Role-specific skills

Skills should use a consistent numerical scale, such as 0–100.

Skills should improve slowly across many shifts.

Progression should depend on:

* Tasks completed
* Role performed
* Experience gained
* Initial aptitude
* Personality modifiers

Do not allow employees to become highly skilled after only a few days.

---

# 21. Employee Personality

Personality should be visible during hiring.

Example personality types or traits:

* Friendly
* Reserved
* Efficient
* Careless
* Methodical
* Abrasive
* Calm
* Energetic
* Slow-paced
* Detail-oriented
* Impatient
* Charismatic

Personality should affect performance in understandable ways.

Examples:

* Friendly employees may improve service satisfaction.
* Efficient employees may complete tasks faster.
* Careless employees may waste inventory.
* Methodical employees may work accurately but slightly more slowly.
* Abrasive employees may reduce customer satisfaction.
* Calm employees may handle intoxicated customers more effectively.

Avoid overly complicated relationship or morale systems.

Do not implement:

* Employee relationships
* Employee morale
* Availability schedules
* Employee theft
* Random call-outs
* Unexpected quitting

Promotions may be added later.

---

# 22. Employee Roles and Cross-Role Work

Employees may perform limited work outside their main role when reasonable.

Examples:

* Bartenders may clean bar areas.
* Bartenders may carry completed drinks to nearby customers.
* Servers may clean tables.
* Barbacks may restock bar inventory.
* Hosts may assist with basic customer organization.
* Cooks may perform basic kitchen cleanup.
* Security may help manage closing procedures.

Employees should not perform unrealistic work.

Examples:

* Bartenders should not cook burgers.
* Security should not prepare cocktails.
* Dishwashers should not manage financial records.

Use a role-permission or task-eligibility system.

---

# 23. Employee Scheduling and Payroll

All hired employees are assumed to work every operating day.

Each employee works the full operating shift:

* 2:00 p.m. to 2:00 a.m.

Do not implement individual availability or shift scheduling initially.

Employee wages accrue across the week.

Payroll is due Sunday.

The player may pay payroll early.

Track:

* Wage per shift or hourly equivalent
* Daily wage accrual
* Weekly wage accrual
* Paid wages
* Unpaid wages
* Employee cost by role
* Labor cost as a percentage of revenue

Tips are separate from wages.

---

# 24. Tips

Customers may leave tips based on:

* Satisfaction
* Service speed
* Employee charisma
* Order value
* Customer archetype
* Service quality

Tip distribution:

* 25% of total tips goes to the bar
* 75% is split among eligible employees

Display:

* Total tips
* Bar share
* Employee share
* Tip amount by day
* Tip amount by week

Employee tip allocation may be simplified initially as an even split among working employees.

---

# 25. Service Simulation

The operational system should use tasks and queues.

Potential tasks include:

* Greet customer
* Seat customer
* Take order
* Prepare drink
* Deliver drink
* Prepare food
* Deliver food
* Restock bar
* Clean bar
* Clean table
* Wash glassware
* Wash dishes
* Process payment
* Remove customer
* Repair equipment

Each task should have:

* Required role or eligible roles
* Required skill
* Duration
* Priority
* Assigned employee
* Related customer
* Related inventory
* Related equipment
* Status

Employee task states should include:

* Idle
* Walking or transitioning
* Serving
* Preparing drink
* Preparing food
* Cleaning
* Restocking
* Processing payment
* Handling customer issue
* Repairing
* Waiting
* Off duty

The game does not require physical animation.

Tasks may be represented through tables, statuses, progress indicators, and live log entries.

---

# 26. Tabs and Transactions

Customers may run an open tab during their visit.

Every tab should include:

* Tab number
* Customer name
* Group association
* Opened time
* Items ordered
* Item quantity
* Unit price
* Tax
* Tip
* Total
* Payment method
* Status
* Closed time

Tabs must be paid before the customer leaves unless a future exceptional event is implemented.

The player should be able to view:

* Open tabs
* Closed tabs
* Daily transactions
* Weekly transactions
* Individual receipts

Create a receipt-style transaction detail view.

The receipt should visually resemble a printed or digital bar receipt and include:

* Business name
* Date
* Time
* Receipt number
* Customer or tab name
* Line items
* Subtotal
* Sales tax
* Tip
* Total
* Payment method

---

# 27. Payments

Support initial payment types:

* Cash
* Credit card

Credit-card payments should include:

* Processing percentage
* Fixed processing fee if configured
* Gross transaction
* Processing cost
* Net proceeds

The architecture should allow later card-service agreements with different rates and terms.

Sales tax must be tracked separately from revenue.

---

# 28. Reputation

The bar should have one main reputation score:

* Service

The service score should be affected by:

* Wait times
* Employee skill
* Employee charisma
* Employee accuracy
* Drink quality
* Food quality
* Product availability
* Cleanliness
* Price satisfaction
* Failed service
* Customer removals
* Equipment problems
* Checkout speed

Reputation should change gradually.

Do not allow one customer review to drastically alter the total score.

Display:

* Current score
* Recent trend
* Daily change
* Weekly change
* Main positive factors
* Main negative factors

---

# 29. Customer Reviews

Customers with sufficient review tendency may leave a review after visiting.

Reviews should use predefined text components.

Do not use an AI service.

Review text may be assembled from:

* Opening phrase
* Service comment
* Product comment
* Price comment
* Cleanliness comment
* Closing phrase

Reviews should reflect the customer’s actual experience.

Examples:

* Long waits
* Friendly bartender
* Fair prices
* Poor drink quality
* Missing menu items
* Fast service
* Dirty seating
* Good value

Include:

* Customer name
* Rating
* Review text
* Visit date
* Key satisfaction factors

---

# 30. Advertising and Promotions

Initial advertising options should include:

* Local newspaper
* Flyers
* Radio
* Social media
* Drink specials
* Live entertainment promotion
* Happy hour

Advertising should differ by:

* Cost
* Duration
* Audience
* Delay before effect
* Peak effect
* Decline rate
* Demographic reach
* Estimated customer increase

Most advertising should build awareness gradually over several days.

Some promotions may affect only one operating day.

Examples:

* One-night drink special
* Happy hour
* Live entertainment promotion

Advertising should not guarantee customers. It should modify demand probabilities.

---

# 31. Competition

The local market should contain between one and four competing bars.

Competitors should be simulated in the background using simplified formulas.

The player should not need a detailed competitor-management screen initially.

Competition should affect:

* Available customer demand
* Neighborhood traffic
* Price expectations
* Market saturation
* Customer preferences

Competitors may:

* Open
* Close
* Improve
* Decline
* Gain reputation
* Lose reputation

Competitors do not need to react directly to the player’s specific pricing or advertising.

The system should create the feeling of a living market without exposing every detail.

---

# 32. Market and Trends

The local economy is fixed by location.

Do not create dynamic inflation or changing wage markets initially.

The neighborhood should define:

* Average customer income
* Traffic level
* Preferred drink types
* Typical spending
* Price tolerance
* Competition level
* Demand by weekday
* Demand by hour

Trends may change over time.

Examples:

* Increased bottled beer demand
* Cocktail popularity
* Reduced demand for a certain liquor
* Increased interest in food
* Temporary nightlife surge

Trends should adjust demand gradually and be visible through reports.

---

# 33. Equipment

Initial equipment categories should include:

* Bar stations
* Refrigerators
* Freezers
* Draft systems
* Glass washers
* Dishwashers
* Cooking equipment
* Tables
* Bar stools
* Storage shelving
* Point-of-sale systems
* Security systems
* Maintenance tools where appropriate

Each equipment item should track:

* Name
* Category
* Purchase price
* Capacity
* Speed
* Condition
* Maintenance cost
* Breakdown risk
* Energy usage
* Current status
* Required space or capacity
* Service output
* Repair history

Upgrades should be purchased individually.

Do not use generic upgrade packages.

---

# 34. Equipment Failure and Maintenance

Equipment condition should decline through use and time.

Poor condition should increase:

* Breakdown probability
* Operating cost
* Task time
* Product waste
* Service delays

Equipment may fail completely during service.

When equipment fails:

* Stop or reduce related operational capacity.
* Generate a live log alert.
* Create a repair requirement.
* Display the operational impact.

Repair options:

1. Employed maintenance worker
2. Contract maintenance service

An employed maintenance worker should:

* Cost wages
* Be available immediately if not occupied
* Repair equipment at a skill-based speed
* Have lower per-repair cost

Contract maintenance should:

* Cost substantially more
* Arrive after a configured delay
* Repair equipment without requiring an employee

---

# 35. Financial Accounting

The game should include detailed financial reporting.

Implement:

* Income statement
* Balance sheet
* Cash-flow statement

The accounting system should use a transaction ledger rather than calculating every report directly from current totals.

Ledger categories should support:

### Revenue

* Drink sales
* Food sales
* Bar share of tips
* Other operating income

### Cost of Goods Sold

* Alcohol consumed
* Soft drinks consumed
* Food ingredients consumed
* Spoilage
* Preparation waste

### Operating Expenses

* Payroll
* Utilities
* Water
* Electricity
* Lease expense
* Licensing
* Advertising
* Equipment maintenance
* Cleaning
* Payment-processing fees
* Contract repair costs

### Assets

* Cash
* Inventory
* Equipment
* Property if owned
* Receivables if later added

### Liabilities

* Startup loan
* Supply tabs
* Accrued payroll
* Utility bills
* Lease obligations
* Sales tax payable
* Other unpaid bills

### Equity

* Owner capital
* Retained earnings
* Current profit or loss

Equipment should lose mechanical condition but should not require accounting depreciation initially.

---

# 36. Loan

The player may accept one $10,000 startup loan.

The loan should define:

* Principal
* Interest rate
* Payment frequency
* Minimum payment
* Remaining balance
* Interest accrued
* Next due date
* Payment history

Use editable configuration values for the loan terms.

Do not bury the loan terms in simulation code.

---

# 37. Live Operations Screen

The Live Operations screen is one of the most important parts of the game.

It should show:

* Current in-game date
* Current in-game time
* Open or closed status
* Pause control
* Current customer count
* Maximum capacity
* Available seats
* Customers waiting
* Revenue today
* Open tabs
* Average wait time
* Service reputation
* Current alerts
* Inventory warnings
* Equipment warnings

It should also contain detailed tables for:

* Every current customer
* Every employee
* Current service tasks
* Open tabs
* Current orders
* Equipment status
* Seating occupancy

Customer table columns may include:

* Name
* Group
* Arrival time
* Current status
* Seat
* Satisfaction
* Intoxication
* Current order
* Wait time
* Tab total

Employee table columns may include:

* Name
* Role
* Current task
* Task progress
* Skill
* Speed
* Accuracy
* Customers served
* Status

---

# 38. Live Activity Log

Create a scrolling operational event log.

Example entries:

* 7:42 p.m. — Bartender Maya Chen served a whiskey sour.
* 7:43 p.m. — Two customers entered.
* 7:44 p.m. — Bottled lager inventory fell below the reorder point.
* 8:03 p.m. — Customer Samuel Ortiz opened a tab.
* 8:17 p.m. — Grill condition dropped below 30%.
* 8:21 p.m. — Customer Kelly Brooks left after waiting too long.
* 9:02 p.m. — Security removed an intoxicated customer.
* 9:06 p.m. — A contract maintenance request was submitted.

The log should support:

* Timestamp
* Category
* Severity
* Related entity
* Message
* Optional detail view

Categories may include:

* Customer
* Employee
* Inventory
* Sale
* Equipment
* Maintenance
* Finance
* Advertising
* System

---

# 39. Main Interface

Use a fixed dark corporate analytics dashboard.

The interface should not use:

* Movable windows
* Resizable panels
* Spreadsheet export
* User-created dashboard layouts

Primary navigation:

* Overview
* Live Operations
* Employees
* Inventory
* Menu & Pricing
* Purchasing
* Equipment
* Advertising
* Market
* Financials
* Reports
* Settings

Use:

* Tables
* Cards
* Forms
* Tabs
* Dropdowns
* Progress indicators
* Charts
* Alerts
* Status badges
* Receipts
* Financial statements

The UI should feel professional and information-dense without becoming unreadable.

The in-game clock and date should remain visible throughout gameplay.

---

# 40. Overview Screen

The Overview screen should summarize:

* Cash
* Outstanding bills
* Current debt
* Revenue today
* Revenue this week
* Profit today
* Profit this week
* Service reputation
* Current occupancy
* Employee count
* Inventory warnings
* Equipment warnings
* Insolvency warning
* Next bill date
* Recent reviews
* Recent operational events
* Basic revenue chart
* Basic expense chart

---

# 41. Reports

Support daily and weekly reports.

Daily report:

* Customer count
* Number of groups
* Sales
* Sales by product
* Cost of goods sold
* Gross profit
* Payroll accrued
* Operating expenses
* Net profit
* Average customer satisfaction
* Average wait time
* Customers lost
* Reasons customers left
* Inventory consumed
* Inventory wasted
* Equipment failures
* Reviews generated

Weekly report:

* Total revenue
* Total expenses
* Net income
* Revenue by category
* Product performance
* Employee performance
* Payroll
* Tips
* Service reputation change
* Advertising performance
* Inventory waste
* Bills due
* Debt status
* Cash-flow summary

---

# 42. Save System

The game should support multiple named saves.

Use local storage initially.

Each save should contain:

* Save ID
* Save name
* Creation date
* Last played date
* Current game date
* Current game time
* Player cash
* Property state
* Employees
* Customers currently present if saved during an active day
* Inventory
* Purchase orders
* Equipment
* Transactions
* Tabs
* Bills
* Ledger
* Reputation
* Advertising
* Competition state
* Trends
* Insolvency status
* Random-number-generator state

Provide:

* Create save
* Load save
* Rename save
* Delete save
* Manual save
* Autosave

Autosave at meaningful checkpoints, including:

* Day start
* Day end
* Major purchase
* Employee hire
* Bill payment
* Periodic interval during active operation

---

# 43. Determinism

The simulation should be sufficiently deterministic that saving and reloading does not produce completely different outcomes.

Use a seeded random-number generator.

Store the random seed and current generator state in the save file.

Random generation should be routed through a centralized random service.

Do not call `Math.random()` throughout unrelated files.

---

# 44. Initial Vertical Slice

The first playable version should allow the player to:

1. Create a named save.
2. View the starter dive bar.
3. Choose to buy or lease it.
4. Begin with $5,000.
5. Accept or decline the $10,000 startup loan.
6. Hire at least one bartender.
7. Hire at least one server.
8. Purchase bottled beer, soft drinks, and basic liquor.
9. Select products for the menu.
10. Set product prices.
11. Open the bar.
12. Watch customers arrive.
13. Watch customers receive seats.
14. Watch customers place orders.
15. Watch employees perform tasks.
16. Watch inventory be consumed.
17. Watch tabs accumulate.
18. Watch customers pay.
19. View receipt-style transaction details.
20. Watch customers leave.
21. See revenue and costs update.
22. Pause and resume the simulation.
23. Close automatically at 2:00 a.m.
24. Review a daily report.
25. Order replacement inventory.
26. Begin the next day.
27. Save and reload the game.

The vertical slice does not need every role, food preparation, security, competition, full accounting, or advanced equipment failures.

It must demonstrate the complete operating loop.

---

# 45. Development Stages

## Stage 0: Project Foundation

Build:

* React and TypeScript project
* Routing or dashboard navigation
* Dark corporate UI shell
* Typed core models
* Central game store
* Seeded random service
* Save versioning
* Local-storage save manager
* Simulation event bus
* Configuration system
* Test framework

Deliver a working application shell with no full simulation yet.

## Stage 1: Core Vertical Slice

Build:

* Starter property
* Buy or lease decision
* Starting cash
* Startup loan
* Basic hiring
* Bartender and server roles
* Basic inventory
* Bottled beer
* Soft drinks
* Basic liquor
* Basic menu
* Product pricing
* Simulation clock
* Open and close cycle
* Individual customer entities
* Seating
* Basic orders
* Bartender preparation
* Server delivery
* Tabs
* Cash and card payments
* Receipts
* Inventory consumption
* Live operations table
* Activity log
* Daily report
* Save and load

This stage must be fully playable before continuing.

## Stage 2: Expanded Employees and Service

Add:

* Cooks
* Hosts
* Dishwashers
* Barbacks
* Security
* Maintenance workers
* Employee personality
* Full skill model
* Skill progression
* Cross-role task eligibility
* Tips
* Better task queues
* Cleaning
* Restocking
* Intoxication
* Customer removal
* Police-call event

## Stage 3: Food and Spoilage

Add:

* Food ingredients
* Predefined food recipes
* Cooking equipment
* Food preparation
* Refrigerators
* Freezers
* Shelf life
* Spoilage
* Waste reporting
* Storage capacity

## Stage 4: Equipment and Maintenance

Add:

* Full equipment system
* Condition
* Wear
* Breakdowns
* Service impact
* Maintenance employees
* Contract repairs
* Repair records
* Individual upgrades

## Stage 5: Accounting and Weekly Bills

Add:

* General ledger
* Income statement
* Balance sheet
* Cash-flow statement
* Weekly payroll
* Utilities
* Lease bills
* Supply tabs
* Sales tax payable
* Loan payments
* Early payment
* Insolvency countdown
* Bankruptcy ending

## Stage 6: Reputation and Advertising

Add:

* Service reputation
* Generated preset reviews
* Advertising campaigns
* Flyers
* Newspaper
* Radio
* Social media
* Drink specials
* Happy hour
* Live entertainment promotion
* Multi-day awareness effects
* Promotion reporting

## Stage 7: Market Simulation

Add:

* One to four background competitors
* Competitor openings
* Competitor closures
* Neighborhood demand
* Customer demographic demand
* Market trends
* Competitor demand pressure
* Market reports

## Stage 8: Management Automation

Add:

* Manager role
* Automatic reorder minimums
* Automatic opening
* Policy controls
* Spending limits
* Automated purchasing safeguards

---

# 46. Required Architecture

Use a structure similar to:

```text
src/
  app/
  components/
  features/
    advertising/
    customers/
    employees/
    equipment/
    financials/
    inventory/
    maintenance/
    market/
    menu/
    operations/
    purchasing/
    reputation/
    saves/
  simulation/
    clock/
    events/
    random/
    tasks/
    engine/
  data/
    customers/
    employees/
    equipment/
    names/
    products/
    properties/
    recipes/
  config/
  services/
  stores/
  types/
  utils/
  tests/
```

This is a guideline, not an absolute requirement.

Keep modules focused.

Examples:

* Customer decision logic should not be inside a customer table component.
* Financial statements should not be calculated inside the Financials page.
* Inventory consumption should not be directly controlled by the drink animation or event-log component.
* Saving should serialize domain state through a save service.
* Product recipes should come from data files.

---

# 47. Simulation Architecture

Create a central simulation engine.

The simulation engine should:

1. Advance game time.
2. Process scheduled events.
3. Generate customer arrivals.
4. Update customer states.
5. Generate tasks.
6. Assign tasks to employees.
7. Advance employee tasks.
8. Consume inventory when appropriate.
9. Process completed orders.
10. Update tabs.
11. Process customer satisfaction.
12. Process payments.
13. Record accounting entries.
14. Update equipment condition.
15. Generate event-log messages.
16. Detect closing time.
17. Produce day-end reports.

Avoid updating the React application every simulated minute if doing so creates excessive rendering.

Use a controlled tick interval and batch state updates where appropriate.

The simulation should remain understandable and debuggable.

---

# 48. State Machines

Use explicit states for customer and employee behavior.

Example customer states:

```text
considering_visit
arriving
waiting_for_seat
seated
waiting_to_order
waiting_for_drink
waiting_for_food
consuming
deciding_next_order
waiting_to_pay
leaving
left
removed
```

Example order states:

```text
created
queued
assigned
preparing
ready
delivering
served
cancelled
```

Example equipment states:

```text
operational
degraded
failed
awaiting_repair
under_repair
```

Example day states:

```text
between_days
opening
open
closing
day_complete
bankrupt
```

---

# 49. Player Commands

Represent major player actions as explicit commands or service methods.

Examples:

* Hire employee
* Fire employee
* Purchase inventory
* Set product price
* Add product to menu
* Remove product from menu
* Purchase equipment
* Request repair
* Pay bill
* Accept loan
* Make loan payment
* Open bar
* Enable auto-open
* Pause game
* Resume game
* Purchase advertising
* Save game

Validate commands and return clear success or error results.

---

# 50. Testing Requirements

Add tests for important systems.

At minimum, test:

* Simulation time conversion
* Opening and closing
* Seeded random consistency
* Inventory consumption
* Bartender waste calculations
* Recipe requirements
* Customer payment
* Sales tax
* Credit-card fees
* Tip distribution
* Weekly payroll accrual
* Bill payment
* Insolvency countdown
* Bankruptcy
* Equipment degradation
* Spoilage
* Save serialization
* Save migration
* Deterministic reload behavior

Use unit tests for simulation logic and integration tests for the operating loop.

---

# 51. Balancing and Debug Tools

Create a development-only debug panel.

The debug panel may support:

* Add cash
* Change game time
* Spawn customer
* Spawn group
* Add inventory
* Reduce inventory
* Force equipment failure
* Set employee skill
* Set reputation
* Skip to closing
* Trigger Sunday billing
* Trigger insolvency
* View simulation seed
* View queued tasks
* View scheduled events

Do not expose the debug panel in production mode.

---

# 52. UX Requirements

The player should always understand:

* Whether the bar is open
* What time it is
* How much cash is available
* Whether bills are due
* Whether inventory is low
* Whether equipment is failing
* Why customers are waiting
* What employees are doing
* Why profit rose or fell
* Why reputation changed
* Whether bankruptcy is approaching

Avoid unexplained numbers.

Use tooltips and detail panels for calculated values.

Financial reports should allow the player to trace totals back to underlying transactions where practical.

---

# 53. Visual Direction

Use a dark, professional, corporate operations aesthetic.

The interface should resemble:

* Business intelligence software
* Enterprise resource planning software
* Financial analytics dashboards
* Operational control software

Avoid:

* Cartoon graphics
* Bright tycoon-game visuals
* Character portraits as the main focus
* Excessive animations
* Room-building interfaces
* Isometric restaurant layouts
* Mobile-game design patterns

Small icons, status indicators, charts, and progress bars are appropriate.

---

# 54. Content Rules

Use fictional names and fictional business data.

Do not use real bar trademarks or real customer information.

Create editable datasets for:

* First names
* Last names
* Employee personalities
* Customer archetypes
* Review text
* Product catalog
* Recipes
* Equipment
* Advertising
* Market events

Preset dialogue may appear in the background.

Dialogue must be selected from static content and contextual templates.

No AI service should be required to run the game.

---

# 55. First Implementation Response

Before writing large amounts of code, provide:

1. A concise architecture summary.
2. The proposed folder structure.
3. Core TypeScript interfaces.
4. The simulation loop design.
5. The state-management approach.
6. The save-system approach.
7. The seeded-random approach.
8. The Stage 1 implementation checklist.
9. Any material assumptions that remain.

Then begin Stage 0 and Stage 1 implementation.

Do not generate placeholder architecture without connecting it to playable systems.

Do not skip directly to visual mockups.

Do not implement later-stage features until the vertical slice works.

---

# 56. Completion Standard for Stage 1

Stage 1 is complete only when the following scenario works:

1. The player creates a save.
2. The player chooses to lease or buy the starter dive bar.
3. The player begins with $5,000.
4. The player may accept the $10,000 loan.
5. The player hires employees.
6. The player purchases supplies.
7. The player configures the menu.
8. The player sets prices.
9. The player opens the bar.
10. The clock advances from 2:00 p.m. to 2:00 a.m.
11. Named customers arrive individually and in groups.
12. Customers occupy seating.
13. Customers place orders.
14. Employees perform tasks.
15. Recipes consume inventory.
16. Employee skill affects service speed and waste.
17. Customer tabs update.
18. Customers pay.
19. Receipts are generated.
20. Cash, tax, fees, and revenue update correctly.
21. Customers leave.
22. Service outcomes are recorded.
23. The bar closes.
24. A daily report is generated.
25. The player orders supplies for the next day.
26. The order arrives at 2:00 p.m. the following day.
27. The save can be closed and reloaded consistently.

Do not declare Stage 1 complete based only on screens, static sample data, or mocked timers.

The full operating loop must function.
