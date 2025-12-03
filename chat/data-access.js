/**
 * Data Access Helper
 * Provides easy access to financial data and calculations for the chat
 */

window.FinancialDataAccess = {
  /**
   * Get all financial data in a structured format
   */
  getAllData() {
    const state = window.state || {};
    
    return {
      expenses: this.getExpensesData(),
      income: this.getIncomeData(),
      analytics: this.getAnalyticsData(),
      currency: this.getCurrencyData(),
      totals: this.getTotals()
    };
  },

  /**
   * Get expenses data (personal + business)
   */
  getExpensesData() {
    const state = window.state || {};
    
    return {
      personal: {
        all: state.personal || [],
        active: (state.personal || []).filter(e => e.status !== 'inactive'),
        inactive: (state.personal || []).filter(e => e.status === 'inactive'),
        monthly: this.getKPIValue('kpiPersonalMonthly'),
        yearly: this.getKPIValue('kpiPersonalYearly'),
        monthlyEGP: this.getKPIValue('kpiPersonalMonthlyEGP'),
        yearlyEGP: this.getKPIValue('kpiPersonalYearlyEGP')
      },
      business: {
        all: state.biz || [],
        active: (state.biz || []).filter(e => e.status !== 'inactive'),
        inactive: (state.biz || []).filter(e => e.status === 'inactive'),
        monthly: this.getKPIValue('kpiBizMonthly'),
        yearly: this.getKPIValue('kpiBizYearly'),
        monthlyEGP: this.getKPIValue('kpiBizMonthlyEGP'),
        yearlyEGP: this.getKPIValue('kpiBizYearlyEGP')
      },
      all: {
        monthly: this.getKPIValue('kpiAllMonthlyUSD'),
        yearly: this.getKPIValue('kpiAllYearlyUSD'),
        monthlyEGP: this.getKPIValue('kpiAllMonthlyEGP'),
        yearlyEGP: this.getKPIValue('kpiAllYearlyEGP'),
        personalShare: this.getKPIValue('sharePersonalVal'),
        businessShare: this.getKPIValue('shareBizVal')
      }
    };
  },

  /**
   * Get income data by year
   */
  getIncomeData() {
    const state = window.state || {};
    const income = state.income || {};
    
    const result = {};
    Object.keys(income).forEach(year => {
      const yearData = income[year] || [];
      result[year] = {
        entries: yearData,
        total: yearData.reduce((sum, entry) => {
          const amount = parseFloat(entry.amount || entry.monthly || 0) || 0;
          return sum + amount;
        }, 0),
        monthlyAverage: yearData.length > 0 
          ? yearData.reduce((sum, entry) => {
              const amount = parseFloat(entry.amount || entry.monthly || 0) || 0;
              return sum + amount;
            }, 0) / yearData.length 
          : 0
      };
    });

    // Get current year totals from KPIs if available
    const currentYear = new Date().getFullYear();
    if (document.getElementById(`kpiIncome${currentYear}`)) {
      result.currentYear = {
        total: this.getKPIValue(`kpiIncome${currentYear}`)
      };
    }

    return result;
  },

  /**
   * Get analytics data from KPIs
   */
  getAnalyticsData() {
    return {
      savings: {
        monthly: this.getKPIValue('kpiSavingsMonthly'),
        yearly: this.getKPIValue('kpiSavingsYearly'),
        rate: this.getKPIValue('kpiSavingsRate')
      },
      efficiency: this.getKPIValue('kpiEfficiency'),
      health: this.getKPIValue('kpiHealth')
    };
  },

  /**
   * Get currency data
   */
  getCurrencyData() {
    const state = window.state || {};
    
    return {
      selected: state.selectedCurrency || 'EGP',
      symbol: state.currencySymbol || 'EGP',
      rate: state.currencyRate || null,
      fxLabel: document.getElementById('kpiFxLabel')?.textContent || null
    };
  },

  /**
   * Get all totals
   */
  getTotals() {
    const expenses = this.getExpensesData();
    const income = this.getIncomeData();
    const currency = this.getCurrencyData();
    
    const currentYear = new Date().getFullYear();
    const currentYearIncome = income[currentYear]?.total || 0;
    
    return {
      expenses: {
        monthly: expenses.all.monthly || 0,
        yearly: expenses.all.yearly || 0,
        monthlyEGP: expenses.all.monthlyEGP || 0,
        yearlyEGP: expenses.all.yearlyEGP || 0
      },
      income: {
        currentYear: currentYearIncome,
        monthlyAverage: currentYearIncome / 12
      },
      savings: {
        monthly: (currentYearIncome / 12) - (expenses.all.monthly || 0),
        yearly: currentYearIncome - (expenses.all.yearly || 0),
        rate: expenses.all.monthly 
          ? (((currentYearIncome / 12) - expenses.all.monthly) / (currentYearIncome / 12) * 100).toFixed(1)
          : 0
      }
    };
  },

  /**
   * Get top expenses by amount
   */
  getTopExpenses(category = 'all', limit = 5) {
    const expenses = this.getExpensesData();
    let allExpenses = [];

    if (category === 'personal') {
      allExpenses = expenses.personal.active.map(e => ({ ...e, category: 'personal' }));
    } else if (category === 'business') {
      allExpenses = expenses.business.active.map(e => ({ ...e, category: 'business' }));
    } else {
      allExpenses = [
        ...expenses.personal.active.map(e => ({ ...e, category: 'personal' })),
        ...expenses.business.active.map(e => ({ ...e, category: 'business' }))
      ];
    }

    // Sort by monthly amount (descending)
    allExpenses.sort((a, b) => {
      const aMonthly = parseFloat(a.monthly || a['monthly-usd'] || 0) || 0;
      const bMonthly = parseFloat(b.monthly || b['monthly-usd'] || 0) || 0;
      return bMonthly - aMonthly;
    });

    return allExpenses.slice(0, limit);
  },

  /**
   * Get expense breakdown by billing cycle
   */
  getExpenseBreakdown() {
    const expenses = this.getExpensesData();
    const allActive = [
      ...expenses.personal.active.map(e => ({ ...e, category: 'personal' })),
      ...expenses.business.active.map(e => ({ ...e, category: 'business' }))
    ];

    const monthly = [];
    const yearly = [];

    allActive.forEach(expense => {
      const billing = expense.billing || expense['billing-cycle'] || 'monthly';
      const monthlyAmount = parseFloat(expense.monthly || expense['monthly-usd'] || 0) || 0;
      
      if (billing.toLowerCase() === 'yearly') {
        yearly.push({ ...expense, monthlyEquivalent: monthlyAmount / 12 });
      } else {
        monthly.push(expense);
      }
    });

    return { monthly, yearly };
  },

  /**
   * Helper to extract numeric value from KPI element
   */
  getKPIValue(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return null;
    
    const text = element.textContent || element.innerText || '';
    
    // Extract number (handles $, commas, percentages)
    const match = text.match(/[\d,]+\.?\d*/);
    if (!match) return null;
    
    const value = parseFloat(match[0].replace(/,/g, ''));
    
    // If it's a percentage, return as-is
    if (text.includes('%')) {
      return value;
    }
    
    return value;
  },

  /**
   * Get formatted financial summary
   */
  getSummary() {
    const totals = this.getTotals();
    const expenses = this.getExpensesData();
    
    return {
      totalMonthlyExpenses: totals.expenses.monthly,
      totalYearlyExpenses: totals.expenses.yearly,
      estimatedMonthlyIncome: totals.income.monthlyAverage,
      estimatedYearlyIncome: totals.income.currentYear,
      monthlySavings: totals.savings.monthly,
      yearlySavings: totals.savings.yearly,
      savingsRate: totals.savings.rate + '%',
      personalExpenses: {
        monthly: expenses.personal.monthly,
        percentage: expenses.all.personalShare
      },
      businessExpenses: {
        monthly: expenses.business.monthly,
        percentage: expenses.all.businessShare
      },
      currency: this.getCurrencyData()
    };
  },

  /**
   * Extract all table data from DOM - every row, every column, every cell
   */
  getAllTableData() {
    const tables = {
      personal: this.getTableData('list-personal', 'row-head', 'sum-personal', 'personal'),
      business: this.getTableData('list-biz', 'row-head.row-biz', 'sum-biz', 'business'),
      income: this.getIncomeTableData('list-income', 'row-head.row-income', 'sum-income')
    };

    return tables;
  },

  /**
   * Extract expense table data (personal or business)
   */
  getTableData(listId, headerSelector, sumSelector, type) {
    const listContainer = document.getElementById(listId);
    // Handle selector - if it has spaces, use querySelector with class selector
    const headerRow = headerSelector.includes(' ') 
      ? document.querySelector(`.${headerSelector.replace(/\s+/g, '.')}`)
      : document.querySelector(`.${headerSelector}`);
    const sumRow = document.getElementById(sumSelector);
    
    if (!listContainer) return { headers: [], rows: [], sum: null };

    // Extract headers
    const headers = [];
    if (headerRow) {
      const headerCells = headerRow.querySelectorAll('div');
      headerCells.forEach((cell, index) => {
        const text = cell.textContent?.trim() || '';
        if (text) {
          headers.push({
            index,
            text,
            column: cell.getAttribute('data-column') || null
          });
        }
      });
    }

    // Extract all rows
    const rows = [];
    const rowElements = listContainer.querySelectorAll('.row:not(.row-head):not(.row-sum)');
    
    rowElements.forEach((rowEl, rowIndex) => {
      const rowData = {
        index: rowIndex,
        cells: [],
        rawData: rowEl.__rowData || null // Stored row data if available
      };

      // Extract all cells
      const cells = rowEl.querySelectorAll('div');
      cells.forEach((cell, cellIndex) => {
        const cellText = cell.textContent?.trim() || '';
        const cellData = {
          index: cellIndex,
          text: cellText,
          html: cell.innerHTML || null,
          classes: Array.from(cell.classList) || []
        };

        // Try to extract specific data based on cell content
        if (cellIndex === 2) cellData.field = 'name';
        else if (cellIndex === 3) cellData.field = 'cost';
        else if (cellIndex === 4) cellData.field = 'status';
        else if (cellIndex === 5) cellData.field = 'billing';
        else if (cellIndex === 6 && type === 'business') cellData.field = 'next';
        else if (cellIndex === 6 && type === 'personal') cellData.field = 'monthlyUSD';
        else if (cellIndex === 7 && type === 'personal') cellData.field = 'yearlyUSD';
        else if (cellIndex === 7 && type === 'business') cellData.field = 'monthlyUSD';
        else if (cellIndex === 8 && type === 'business') cellData.field = 'yearlyUSD';
        else if (cellIndex === 8 && type === 'personal') cellData.field = 'monthlyEGP';
        else if (cellIndex === 9 && type === 'personal') cellData.field = 'yearlyEGP';
        else if (cellIndex === 9 && type === 'business') cellData.field = 'monthlyEGP';
        else if (cellIndex === 10 && type === 'business') cellData.field = 'yearlyEGP';

        rowData.cells.push(cellData);
      });

      rows.push(rowData);
    });

    // Extract sum row
    let sumData = null;
    if (sumRow) {
      const sumCells = sumRow.querySelectorAll('div');
      sumData = {
        cells: Array.from(sumCells).map((cell, index) => ({
          index,
          text: cell.textContent?.trim() || '',
          html: cell.innerHTML || null
        }))
      };
    }

    return {
      headers,
      rows,
      sum: sumData,
      rowCount: rows.length
    };
  },

  /**
   * Extract income table data
   */
  getIncomeTableData(listId, headerSelector, sumSelector) {
    const listContainer = document.getElementById(listId);
    // Handle selector - if it has spaces, use querySelector with class selector
    const headerRow = headerSelector.includes(' ')
      ? document.querySelector(`.${headerSelector.replace(/\s+/g, '.')}`)
      : document.querySelector(`.${headerSelector}`);
    const sumRow = document.getElementById(sumSelector);
    
    if (!listContainer) return { headers: [], rows: [], sum: null };

    // Extract headers
    const headers = [];
    if (headerRow) {
      const headerCells = headerRow.querySelectorAll('div');
      headerCells.forEach((cell, index) => {
        const text = cell.textContent?.trim() || '';
        if (text) {
          headers.push({
            index,
            text,
            id: cell.id || null
          });
        }
      });
    }

    // Extract all rows
    const rows = [];
    const rowElements = listContainer.querySelectorAll('.row-income:not(.row-head):not(.row-sum)');
    
    rowElements.forEach((rowEl, rowIndex) => {
      const rowData = {
        index: rowIndex,
        cells: [],
        rawData: rowEl.__rowData || null // Stored row data if available
      };

      // Extract all cells
      const cells = rowEl.querySelectorAll('div');
      cells.forEach((cell, cellIndex) => {
        const cellText = cell.textContent?.trim() || '';
        const cellData = {
          index: cellIndex,
          text: cellText,
          html: cell.innerHTML || null,
          classes: Array.from(cell.classList) || []
        };

        // Map income table columns
        if (cellIndex === 2) cellData.field = 'projectName';
        else if (cellIndex === 3) cellData.field = 'tags';
        else if (cellIndex === 4) cellData.field = 'date';
        else if (cellIndex === 5) cellData.field = 'allPayment';
        else if (cellIndex === 6) cellData.field = 'paidUSD';
        else if (cellIndex === 7) cellData.field = 'paidEGP';
        else if (cellIndex === 8) cellData.field = 'method';
        else if (cellIndex === 9) cellData.field = 'note';
        else if (cellIndex === 10) cellData.field = 'progress';

        rowData.cells.push(cellData);
      });

      rows.push(rowData);
    });

    // Extract sum row
    let sumData = null;
    if (sumRow) {
      const sumCells = sumRow.querySelectorAll('div');
      sumData = {
        cells: Array.from(sumCells).map((cell, index) => ({
          index,
          text: cell.textContent?.trim() || '',
          html: cell.innerHTML || null
        }))
      };
    }

    return {
      headers,
      rows,
      sum: sumData,
      rowCount: rows.length
    };
  }
};


