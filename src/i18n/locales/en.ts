/**
 * The English catalogue — the source of truth for every other language.
 *
 * Rules that hold across all six catalogues and are asserted by
 * `src/i18n/catalogues.test.ts`:
 *
 * - Every key here exists in every other language, with the same `{{placeholders}}`.
 * - A key used with a count carries the plural forms its language needs, which
 *   is two here and six in Arabic. Only the `_one` / `_other` pair is declared
 *   in English; the other languages add the categories they resolve to.
 * - Copy describes, it never concludes. The app has no opinion on whether a
 *   purchase is a good idea, so "afford", "worth it", "waste" and "you should"
 *   — and their equivalents in every other language — are absent by design.
 */
export const en = {
  common: {
    back: 'Go back',
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    done: 'Done',
    loading: 'Loading',
    tryAgain: 'Try again',
    somethingWentWrong: 'Something went wrong',
    required: 'required',
    notSet: 'Not set',
    optional: 'Optional',
    /** The dash shown where a figure cannot be computed. */
    noValue: '—',
    /** Joins the parts of a composed accessibility label. */
    listSeparator: ', ',
    /** Joins two facts on one line, e.g. `Monthly · Housing`. */
    dotSeparator: ' · ',
    cannotBeUndone: 'This cannot be undone.',
  },

  app: {
    databaseOpening: 'Opening your data',
    databaseErrorTitle: 'Your data could not be opened',
    databaseErrorDescription:
      'ThinkTwice stores everything on this device. Restarting the app usually resolves this.',
  },

  /**
   * Counted nouns and the unit suffixes attached to a figure.
   *
   * `{{count, number}}` runs through the app's own number formatter, so a count
   * is grouped like every other figure on screen: an item used daily for five
   * years reads "1,820 uses", not "1820 uses".
   */
  units: {
    day_one: '{{count, number}} day',
    day_other: '{{count, number}} days',
    week_one: '{{count, number}} week',
    week_other: '{{count, number}} weeks',
    month_one: '{{count, number}} month',
    month_other: '{{count, number}} months',
    year_one: '{{count, number}} year',
    year_other: '{{count, number}} years',
    use_one: '{{count, number}} use',
    use_other: '{{count, number}} uses',
    item_one: '{{count, number}} item',
    item_other: '{{count, number}} items',
    perMonth: '/ month',
    perYear: '/ year',
    perUse: '/ use',
  },

  duration: {
    today: 'today',
    /** `2 years 3 months` — both parts are already counted nouns. */
    yearsAndMonths: '{{years}} {{months}}',
  },

  /**
   * Category names. Purchase and commitment categories share this namespace
   * because the ids are unique across both sets and the few that overlap
   * (`transport`, `education`, `other`) mean the same thing in each.
   */
  categories: {
    technology: 'Technology',
    photography: 'Photography',
    clothing: 'Clothing',
    sport: 'Sport',
    home: 'Home',
    transport: 'Transport',
    health: 'Health',
    travel: 'Travel',
    entertainment: 'Entertainment',
    education: 'Education',
    other: 'Other',
    housing: 'Housing',
    utilities: 'Utilities',
    subscriptions: 'Subscriptions',
    phone_internet: 'Phone & internet',
    insurance: 'Insurance',
    health_fitness: 'Health & fitness',
    food: 'Food',
    phone: 'Phone',
  },

  frequencies: {
    monthly: 'Monthly',
    every_two_months: 'Every 2 months',
    quarterly: 'Quarterly',
    semiannual: 'Every 6 months',
    annual: 'Yearly',
    /** The short form after an amount, e.g. `€78 / month`. */
    short: {
      monthly: 'month',
      every_two_months: '2 months',
      quarterly: 'quarter',
      semiannual: '6 months',
      annual: 'year',
    },
  },

  usage: {
    daily: 'Daily',
    several_times_week: 'Several times per week',
    weekly: 'Weekly',
    several_times_month: 'Several times per month',
    monthly: 'Monthly',
    occasionally: 'Occasionally',
    custom: 'Custom',
    /** Shown under the choice so the assumption behind the figure is visible. */
    detail: {
      daily: 'About once a day',
      several_times_week: '2–3 times per week (midpoint: 2.5)',
      weekly: 'About once a week',
      several_times_month: '2–3 times per month (midpoint: 2.5)',
      monthly: 'About once a month',
      occasionally: 'A few times a year (4 per year)',
      custom: 'Set your own number of uses per month',
    },
    /** Compact form for chips and list rows. */
    short: {
      several_times_week: '2–3 times per week',
      several_times_month: '2–3 times per month',
    },
    customRate_one: '{{count, number}} use per month',
    customRate_other: '{{count, number}} uses per month',
  },

  form: {
    dateFieldLabel: '{{label}}: {{date}}',
    dateFieldHint: 'Opens a date picker',
  },

  navigation: {
    home: 'Home',
    money: 'Money',
    purchases: 'Purchases',
    insights: 'Insights',
    add: 'Add an item',
    addHint: 'Opens the flow to add something you want to buy or already own',
  },

  impact: {
    sectionTitle: 'Purchase impact',
    level: {
      low: 'Low',
      moderate: 'Moderate',
      high: 'High',
      unknown: 'Not available',
    },
    chip: '{{level}} financial impact',
    ofMonthlyIncome: 'of monthly income',
    ofMonthlyAvailable: 'of monthly available',
    monthsOfAvailable: 'months of available money',
    unavailableTitle: 'Financial impact unavailable',
    unavailableDescription:
      'Add your monthly net income on the Money screen to see how this price compares.',
    noAvailableMoney:
      'Your recurring commitments currently use all of your monthly income, so there is no available amount to compare this price against.',
  },

  cooldown: {
    sectionTitle: 'Reflection period',
    remindersOn: 'ThinkTwice will remind you about this item when the period is over.',
    remindersOff:
      'ThinkTwice will hold on to this item until the period is over. Turn on reminders in Settings to be notified.',
    giveYourself: 'Give yourself',
    editHint: 'Counted from when this reflection period started, not from today.',
    suggestionHint: 'Suggested: {{period}}. {{rationale}} You can change it.',
    rationale: {
      small_share: 'Small compared to your monthly available amount.',
      under_a_fifth: 'Under a fifth of your monthly available amount.',
      noticeable_share: 'A noticeable share of your monthly available amount.',
      about_a_month: 'Around a month of your available amount.',
      over_a_month: 'More than a month of your available amount.',
      price_only: 'Based on the price, since no income is set yet.',
    },
    complete: 'Reflection period complete',
    underAnHour: 'Less than an hour remaining',
    hoursRemaining_one: '{{count, number}} hour remaining',
    hoursRemaining_other: '{{count, number}} hours remaining',
    daysRemaining_one: '{{count, number}} day remaining',
    daysRemaining_other: '{{count, number}} days remaining',
    readyToDecide: 'Ready to decide',
    hoursLeftShort: '{{hours, number}}h left',
    daysLeftShort_one: '{{count, number}} day left',
    daysLeftShort_other: '{{count, number}} days left',
    progressLabel: '{{remaining, number}} of {{total, number}} days remaining',
    completeBody: 'You have had time to think it over. The decision is yours.',
    chosenPeriod_one: 'You chose to reconsider this after {{count, number}} day.',
    chosenPeriod_other: 'You chose to reconsider this after {{count, number}} days.',
    endsOn: 'Ends {{date}}',
  },

  wishlist: {
    openItemHint: 'Opens this item',
    notFound: 'Item not found',
    notFoundDescription: 'This item may have been deleted.',
    editLabel: 'Edit item',
    boughtIt: 'You bought this',
    dismissedIt: 'You decided against this',
    whyYouWantIt: 'Why you want it',
    delete: 'Delete this item',
    deleteError: 'This could not be deleted. Please try again.',
    dismissError: 'This could not be saved. Please try again.',
    dismissTitle: 'Remove from what you are considering?',
    dismissMessage: 'The item stays in your history, and the reminder is cancelled.',
    dismissConfirm: 'I don’t want it',
    estimateTitle: 'Estimate',
    estimatedUses: 'estimated uses',
    estimatedCostPerUse: 'estimated cost / use',
    estimateHint: 'Choose how often you expect to use it and for how long.',
    /** `Several times per week for 3 years` — the inputs behind the estimate. */
    estimateSummary: '{{frequency}} for {{duration}}',
    expectedUsageTitle: 'Expected usage',
    expectedUsageSubtitle:
      'Your best guess is enough — it is what turns a price into a cost per use.',
    nameLabel: 'Name',
    namePlaceholder: 'What are you considering?',
    priceLabel: 'Price',
    categoryLabel: 'Category',
    frequencyLabel: 'How often will you use it?',
    usesPerMonthLabel: 'Uses per month',
    ownershipLabel: 'How long will you keep it?',
    reasonTitle: 'Why do you want it?',
    notesLabel: 'Notes',
    notesPlaceholder: 'Anything you want to remember when you decide.',
    saveError: 'This item could not be saved. Please try again.',
    iBoughtIt: 'I bought it',
    noLongerWantIt: "I don't want it anymore",
    deleteTitle: 'Delete this item?',
    deleteConsequence: {
      purchased:
        'The purchase itself stays in ThinkTwice, but the estimate you made before buying it is lost, so there will be nothing left to compare with what it really costs.',
      dismissed:
        'It will be removed from ThinkTwice completely, including from what you decided against.',
      open: 'It will be removed from ThinkTwice completely, and the reflection period you have already spent on it goes with it.',
    },
    confirmPurchase: {
      title: 'Add to your purchases',
      description:
        '{{name}} moves to your purchases, where you can track how much you use it. Its cost per use is worked out from what you actually paid.',
      priceLabel: 'What you paid',
      priceHint:
        'Prefilled with the price you were considering. Change it if you paid something else.',
      dateLabel: 'When did you buy it?',
      dateHint: 'Used to work out how long you have owned it.',
      saveError: 'This could not be saved. Please try again.',
    },
  },

  purchases: {
    listTitle: 'Purchases',
    listError: 'Your purchases could not be read.',
    emptyTitle: 'Nothing tracked yet',
    emptyDescription: 'Add something you own to start recording uses and see what it really costs.',
    emptyAction: 'Add a purchase',
    openHint: 'Opens this purchase',
    notFound: 'Purchase not found',
    notFoundDescription: 'This purchase may have been deleted.',
    editLabel: 'Edit purchase',
    resaleTitle: 'Current resale value',
    addExpense: 'Add expense',
    delete: 'Delete this purchase',
    deleteError: 'This could not be deleted. Please try again.',
    noUsageData: 'No usage data yet',
    noUsesRecorded: 'No uses recorded',
    /** `12 uses, Home` — the row's composed accessibility label. */
    cardLabel: '{{name}}, {{category}}, {{uses}}',
    sort: {
      recent: 'Recent',
      most_used: 'Most used',
      lowest_cost_per_use: 'Lowest cost/use',
      highest_cost_per_use: 'Highest cost/use',
      highest_price: 'Highest price',
      label: 'Sort purchases',
    },
    boughtOn: 'Bought {{date}}',
    ownedFor: 'Owned for {{duration}}',
    noUsageYet: 'No usage yet',
    usesMetric: 'uses',
    costPerUseMetric: 'cost per use',
    recordUse: 'I used it',
    recordUseHint: 'Records one use of this item',
    recordUseError: 'That use could not be recorded. Please try again.',
    undoLastUse: 'Undo last use',
    undoUseError: 'That use could not be removed. Please try again.',
    usageDescription:
      'Record a use each time you reach for it — that is what turns a price into a cost per use.',
    lastUsed: 'Last used {{date}}',
    usesRecorded_one: '{{count, number}} use recorded so far',
    usesRecorded_other: '{{count, number}} uses recorded so far',
    recentUses: {
      title: 'Recent uses',
      subtitle: 'Tap one to remove it.',
      subtitleLimited: 'The last {{limit, number}}. Tap one to remove it.',
      rowHint: 'Removes this recorded use',
      removeTitle: 'Remove this use?',
      removeMessage: 'The cost per use is worked out again without it.',
      removeConfirm: 'Remove',
    },
    resale: {
      label: 'What is it worth today?',
      hint: 'Your own estimate. It lowers the real cost of ownership, because that value is not spent.',
      save: 'Save resale value',
      saveError: 'This could not be saved. Please try again.',
    },
    expectationTitle: 'What you expected',
    expectationSubtitle: 'Recorded when you added this item, beside what has happened since.',
    actualRate: 'Actually {{rate}} / month',
    realCost: {
      title: 'Real cost',
      purchasePrice: 'Purchase price',
      additionalExpenses: 'Additional expenses',
      resaleValue: 'Resale value',
      current: 'Current real cost',
      netPositive:
        'The resale value you entered is higher than what you have spent on this item so far.',
      costPerUse: 'Real cost per use',
    },
    expenses: {
      title: 'Expenses',
      recorded_one: '{{count, number}} recorded',
      recorded_other: '{{count, number}} recorded',
      emptyTitle: 'Nothing spent on this yet',
      emptyDescription:
        'Accessories, repairs and servicing count towards what this item really costs, so adding them keeps the cost per use honest as it ages.',
      rowHint: 'Opens this expense to edit or remove it',
      editTitle: 'Edit expense',
      newTitle: 'New expense',
      sheetDescription:
        'Accessories, maintenance, repairs — anything you spent on this item after buying it.',
      nameLabel: 'What was it?',
      namePlaceholder: 'Extra battery, service, case…',
      amountLabel: 'Amount',
      typeLabel: 'Type',
      dateLabel: 'Date',
      add: 'Add expense',
      saveChanges: 'Save changes',
      remove: 'Remove expense',
      saveError: 'This expense could not be saved. Please try again.',
      removeError: 'This expense could not be removed. Please try again.',
      removeTitle: 'Remove this expense?',
      removeMessage: '{{name}} will no longer count towards the real cost.',
      removeConfirm: 'Remove',
      type: {
        accessory: 'Accessory',
        maintenance: 'Maintenance',
        repair: 'Repair',
        upgrade: 'Upgrade',
        other: 'Other',
      },
    },
    form: {
      nameLabel: 'Name',
      namePlaceholder: 'What do you own?',
      priceLabel: 'Purchase price',
      dateLabel: 'Purchase date',
      dateHint: 'Used to work out how long you have owned it.',
      categoryLabel: 'Category',
      resaleLabel: 'Current resale value',
      resaleHint:
        'Optional. What you think it is worth today — it reduces the real cost of ownership.',
      expectationTitle: 'What you expected',
      expectationSubtitle:
        'Optional. If you had a rough idea when you got it, the app can hold it up against what actually happened.',
      frequencyLabel: 'How often did you expect to use it?',
      usesPerMonthLabel: 'Uses per month',
      ownershipLabel: 'How long did you expect to keep it?',
      saveError: 'This purchase could not be saved. Please try again.',
    },
    deleteTitle: 'Delete this purchase?',
    deleteMessage: 'Its uses and expenses are removed too. This cannot be undone.',
  },

  money: {
    title: 'Money',
    settingsLabel: 'Settings',
    error: 'Your financial setup could not be read from this device.',
    setupTitle: 'Your monthly setup',
    incomeLabel: 'Monthly net income',
    incomeHint: 'What actually reaches your account each month.',
    savingsLabel: 'Monthly savings target',
    savingsHint: 'Optional. Kept separate from your commitments.',
    saveChanges: 'Save changes',
    saveError: 'Your changes could not be saved. Please try again.',
    overviewTitle: 'Monthly overview',
    netIncome: 'Net income',
    recurringCommitments: 'Recurring commitments',
    savingsGoal: 'Savings goal',
    availableAfterCommitments: 'Available after commitments',
    availableAfterSavings: 'Available after savings goal',
    commitmentsExceedIncome:
      'Your recurring commitments are currently larger than your net income.',
    commitmentsHint: 'Rent, utilities, subscriptions, insurance',
    commitmentsEmptyTitle: 'No commitments yet',
    commitmentsEmptyDescription:
      'Add the bills you pay on a regular schedule to see what stays available.',
    pausedTitle: 'Paused',
    pausedSubtitle: 'Kept in your list, left out of every total',
    total: 'Total',
    addCommitment: 'Add commitment',
    addCommitmentHint: 'Opens the form to add a recurring commitment',
    /** `Rent, Housing, Monthly` — the row's composed accessibility label. */
    commitmentLabel: '{{name}}, {{category}}, {{frequency}}',
    commitmentPaused: 'paused',
    commitmentPausedPrefix: 'Paused',
    commitmentHint: 'Opens this commitment for editing',
    /** `2 active` / `2 active, 1 paused` */
    activeCount_one: '{{count, number}} active',
    activeCount_other: '{{count, number}} active',
    activeAndPausedCount_one: '{{count, number}} active, {{paused, number}} paused',
    activeAndPausedCount_other: '{{count, number}} active, {{paused, number}} paused',
    commitment: {
      addTitle: 'Add commitment',
      editTitle: 'Edit commitment',
      saveChanges: 'Save changes',
      nameLabel: 'Name',
      namePlaceholder: 'Rent, Netflix, gym…',
      amountLabel: 'Amount',
      amountHint: 'Enter what you are billed, not a monthly average.',
      frequencyLabel: 'How often are you billed?',
      categoryLabel: 'Category',
      activeLabel: 'Counts towards your month',
      activeHint:
        'Turn this off to pause the commitment. It stays in your list and keeps its history, but stops being subtracted from your income.',
      monthlyEquivalent: 'Monthly equivalent',
      delete: 'Delete commitment',
      deleteTitle: 'Delete this commitment?',
      deleteMessage: 'It will no longer be subtracted from your monthly income.',
      saveError: 'This commitment could not be saved. Please try again.',
    },
  },

  insights: {
    title: 'Insights',
    rangeLabel: 'Time range',
    range: {
      this_year: 'This year',
      last_12_months: 'Last 12 months',
      all_time: 'All time',
    },
    error: 'Your insights could not be calculated.',
    emptyTitle: 'No insights yet',
    emptyDescription:
      'Once you track a few purchases and record some uses, your totals and cost per use appear here.',
    emptyAction: 'Add a purchase',
    trackedPurchases: 'Tracked purchases',
    averageCostPerUse: 'Average cost/use',
    fromItemsWithUses_one: 'From {{count, number}} item with uses',
    fromItemsWithUses_other: 'From {{count, number}} items with uses',
    noUsesRecordedYet: 'No uses recorded yet',
    excludedFromAverage_one:
      '{{count, number}} item without recorded uses is excluded from the average.',
    excludedFromAverage_other:
      '{{count, number}} items without recorded uses are excluded from the average.',
    costPerUseTitle: 'Cost per use',
    lowestCostPerUse: 'Lowest cost per use',
    highestCostPerUse: 'Highest cost per use',
    highlightLabel: '{{label}}: {{name}}',
    byCategory: 'By category',
    decidedAgainst: 'Decided against',
    avoidedTotal: 'would have cost',
    avoidedCountLabel: 'decided against',
    avoidedCaption:
      'What these items would have cost. ThinkTwice does not count it as money saved — only as money that did not go to these.',
    commitmentsTitle: 'Recurring commitments',
    perMonth: 'Per month',
    perYear: 'Per year',
  },

  add: {
    screenTitle: 'Add item',
    question: 'What are you adding?',
    wantToBuy: 'Something I want to buy',
    wantToBuyDescription: 'Add it to your wishlist and think twice before deciding.',
    alreadyOwn: 'Something I already own',
    alreadyOwnDescription: 'Track usage and see the real cost of ownership.',
    recent: 'Recent',
    entryLabel: '{{name}}, {{caption}}',
    thinkingCaption: 'Thinking about',
    ownedCaption: 'Owned',
    startThinking: 'Start thinking',
    addPurchase: 'Add purchase',
    saveChanges: 'Save changes',
    editItem: 'Edit item',
    editPurchase: 'Edit purchase',
    itemDecidedTitle: 'This item has been decided',
    itemDecidedDescription:
      'An item you have decided on is part of your history and is no longer edited.',
  },

  onboarding: {
    slides: {
      /** The line breaks are part of the design: each title is set on two lines. */
      first: {
        title: 'Buy better.\nLive better.',
        body: 'ThinkTwice helps you understand the real impact of your purchases — before and after you make them.',
      },
      second: {
        title: 'Think before\nyou buy.',
        body: 'Add what you are considering, see how it compares to your month, and give yourself a reflection period before deciding.',
      },
      third: {
        title: 'Know the\nreal cost.',
        body: 'Record each use with one tap. Over time, a price turns into something more useful: a cost per use.',
      },
    },
    stepLabel: 'Step {{current, number}} of {{total, number}}',
    skip: 'Skip',
    skipLabel: 'Skip introduction',
    continue: 'Continue',
    getStarted: 'Get started',
    incomeTitle: 'One number to start',
    incomeBody:
      'Your monthly net income is what lets ThinkTwice put a price in context. You can add it later instead, and add your recurring commitments whenever you like.',
    incomeLabel: 'Monthly net income',
    incomeHint: 'What actually reaches your account each month.',
    skipForNow: 'Skip for now',
    back: 'Back',
    saveError: 'Your setup could not be saved. Please try again.',
  },

  settings: {
    title: 'Settings',
    appearance: {
      title: 'Appearance',
      system: 'System',
      light: 'Light',
      dark: 'Dark',
      followingSystem: 'Following your device setting.',
      alwaysLight: 'Always light.',
      alwaysDark: 'Always dark.',
    },
    language: {
      title: 'Language',
      row: 'Language',
      system: 'System default',
      systemDetail: 'Follows the language your device is set to.',
      description: 'Dates, amounts and numbers follow the language you choose.',
      restartRequired: 'Close and reopen the app to lay it out right to left.',
      restartRequiredBack: 'Close and reopen the app to lay it out left to right.',
    },
    currency: {
      title: 'Currency',
      onlyOne: 'The only currency in this version.',
      notConverted:
        'Amounts are stored exactly as you enter them and are never converted, so another currency would relabel your figures rather than translate them.',
      changeNote:
        '{{currency}}. Amounts already entered are not converted — only how they are displayed changes.',
    },
    notifications: {
      title: 'Notifications',
      remindersTitle: 'Reflection reminders',
      remindersSubtitle: 'A local reminder when a reflection period ends.',
      enabled: 'Reminders are on. New reflection periods will end with a reminder.',
      enabledWithPending_one:
        'Reminders are on. {{count, number}} item already waiting will remind you too.',
      enabledWithPending_other:
        'Reminders are on. {{count, number}} items already waiting will remind you too.',
      unsupported: 'Reminders are not available on this platform. Cooldowns still work.',
      denied:
        'Notifications are turned off for ThinkTwice. You can enable them in your device settings — cooldowns work either way.',
      expoGo:
        'Reminders need a development build — Expo Go cannot schedule them on Android. Reflection periods still end on time without them.',
      platformUnavailable:
        'Reminders are not available on this platform. Reflection periods still end on time without them.',
    },
    money: {
      title: 'Money',
      rowTitle: 'Monthly financial setup',
      rowSubtitle: 'Net income, savings target and recurring commitments',
    },
    privacy: {
      title: 'Privacy',
      heading: 'Everything stays on this device',
      body: 'ThinkTwice has no account, no server and no analytics. Your income, commitments and purchases are stored in a local database and are never sent anywhere.',
    },
    data: {
      title: 'Data',
      heading: 'Local database',
      schemaVersion: 'Schema version {{version, number}}. Deleting the app removes this data.',
      reset: 'Reset all local data',
      resetTitle: 'Delete all local data?',
      resetMessage:
        'Your income, commitments, wishlist, purchases, usage history and item photos will be permanently removed from this device. This cannot be undone.',
      resetConfirm: 'Delete everything',
    },
    development: {
      title: 'Development',
      subtitle: 'Only present in development builds.',
      seed: 'Load sample data',
      seedDescription:
        'Adds example income, commitments, wishlist items and purchases on top of what is already stored.',
    },
    about: {
      title: 'About',
      appName: 'ThinkTwice',
      version: 'Version {{version}}',
      body: 'An independent personal project. It helps you understand the impact of a purchase before you make it, and what it really costs afterwards. It never tells you what to buy.',
    },
  },

  home: {
    greeting: 'Here’s your overview',
    settingsLabel: 'Settings',
    seeAll: 'See all',
    addItem: 'Add an item',
    thinkingAbout: 'Thinking about',
    thinkingEmptyTitle: 'Nothing on your mind yet',
    thinkingEmptyDescription:
      'Add something you are considering and give yourself time before deciding.',
    recentPurchases: 'Recent purchases',
    purchasesEmptyTitle: 'No purchases tracked',
    purchasesEmptyDescription:
      'Track something you already own to see what it really costs per use.',
    addPurchase: 'Add a purchase',
    setUpTitle: 'Set up your monthly picture',
    setUpDescription: 'Add your net income and recurring commitments to see what stays available.',
    setUpHint: 'Opens the Money screen',
    availableAfterCommitments: 'Available after commitments',
    thisMonth: 'this month',
    availableRatioLabel: '{{percent}} of monthly income remains available',
    netIncome: 'Net income',
    commitments: 'Commitments',
    savingsGoal: 'Savings goal',
  },

  wishlistList: {
    title: 'Thinking about',
    error: 'Your wishlist could not be read.',
    emptyTitle: 'Nothing on your mind',
    emptyDescription:
      'Add something you are considering. ThinkTwice will hold on to it and remind you when your reflection period is over.',
    readyTitle: 'Ready to decide',
    readySubtitle: 'Your reflection period is over for these.',
    thinkingTitle: 'Thinking',
  },

  images: {
    label: 'Photo',
    hint: 'Optional. Stored on this device only.',
    add: 'Add a photo',
    replace: 'Replace photo',
    remove: 'Remove photo',
    permissionDenied:
      'ThinkTwice needs access to your photos to add one. You can allow it in Settings.',
    failed: 'The photo could not be added.',
  },

  notifications: {
    channelName: 'Reflection reminders',
    cooldownTitle: 'Time to decide',
    cooldownBody: 'Your reflection period for {{name}} is over.',
  },

  validation: {
    /** Shared by more than one form, so the same slip reads the same everywhere. */
    categoryRequired: 'Choose a category.',
    nameTooLong80: 'Keep the name under 80 characters.',
    nameTooLong60: 'Keep the name under 60 characters.',
    amountRequired: 'Enter an amount.',
    amountNegative: 'The amount cannot be negative.',
    amountTooLarge: 'That amount looks too large.',
    usesRequired: 'Enter how many times per month you expect to use it.',
    usesTooMany: 'That looks like too many uses per month.',
    ownershipTooShort: 'Expected ownership must be at least one month.',
    ownershipTooLong: 'That is longer than this app plans for.',
    wishlist: {
      nameRequired: 'Give this item a name.',
      priceRequired: 'Enter a price.',
      pricePositive: 'Enter a price greater than zero.',
      priceTooLarge: 'That price looks too large.',
      ownershipRequired: 'Choose how long you expect to keep it.',
      cooldownRequired: 'Choose a reflection period.',
      cooldownTooShort_one: 'A reflection period is at least {{count, number}} day.',
      cooldownTooShort_other: 'A reflection period is at least {{count, number}} days.',
      cooldownTooLong_one: 'A reflection period is at most {{count, number}} day.',
      cooldownTooLong_other: 'A reflection period is at most {{count, number}} days.',
      notesTooLong: 'Keep notes under 500 characters.',
    },
    purchase: {
      nameRequired: 'Give this item a name.',
      priceRequired: 'Enter what you paid.',
      priceNegative: 'The price cannot be negative.',
      priceTooLarge: 'That price looks too large.',
      dateRequired: 'Choose a purchase date.',
      dateInvalid: 'Choose a valid purchase date.',
      resaleNegative: 'A resale value cannot be negative.',
      resaleTooLarge: 'That value looks too large.',
      expenseNameRequired: 'Give this expense a name.',
      expenseDateRequired: 'Choose a date.',
    },
    money: {
      nameRequired: 'Give this commitment a name.',
      incomeRequired: 'Enter your monthly net income.',
      incomeNegative: 'Income cannot be negative.',
      savingsNegative: 'A savings target cannot be negative.',
    },
  },
};

export type EnglishCatalogue = typeof en;
