import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      nav: {
        dashboard: 'Dashboard',
        alerts: 'Alerts',
        rules: 'RA Rules',
        domains: 'Domain Control',
        revenue: 'Revenue Streams',
        users: 'User Management',
        reports: 'Reports',
        settings: 'Settings'
      },
      header: {
        search: 'Search...',
        notifications: 'Notifications',
        profile: 'Profile',
        logout: 'Logout',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode',
        language: 'Language'
      },
      dashboard: {
        title: 'Dashboard',
        totalAlerts: 'Total Alerts',
        activeRules: 'Active Rules',
        revenue: 'Revenue',
        users: 'Total Users',
        recentAlerts: 'Recent Alerts',
        performance: 'System Performance'
      },
      alerts: {
        title: 'Alert Management',
        new: 'New Alert',
        filter: 'Filter',
        export: 'Export',
        severity: 'Severity',
        status: 'Status',
        date: 'Date',
        description: 'Description',
        actions: 'Actions'
      },
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        refresh: 'Refresh',
        loading: 'Loading...',
        noData: 'No data available',
        confirm: 'Confirm',
        close: 'Close'
      }
    }
  },
  fr: {
    translation: {
      nav: {
        dashboard: 'Tableau de bord',
        alerts: 'Alertes',
        rules: 'Règles RA',
        domains: 'Contrôle de domaine',
        revenue: 'Flux de revenus',
        users: 'Gestion des utilisateurs',
        reports: 'Rapports',
        settings: 'Paramètres'
      },
      header: {
        search: 'Rechercher...',
        notifications: 'Notifications',
        profile: 'Profil',
        logout: 'Déconnexion',
        darkMode: 'Mode sombre',
        lightMode: 'Mode clair',
        language: 'Langue'
      },
      dashboard: {
        title: 'Tableau de bord',
        totalAlerts: 'Total des alertes',
        activeRules: 'Règles actives',
        revenue: 'Revenus',
        users: 'Total des utilisateurs',
        recentAlerts: 'Alertes récentes',
        performance: 'Performance du système'
      },
      alerts: {
        title: 'Gestion des alertes',
        new: 'Nouvelle alerte',
        filter: 'Filtrer',
        export: 'Exporter',
        severity: 'Gravité',
        status: 'Statut',
        date: 'Date',
        description: 'Description',
        actions: 'Actions'
      },
      common: {
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        edit: 'Modifier',
        add: 'Ajouter',
        search: 'Rechercher',
        filter: 'Filtrer',
        export: 'Exporter',
        import: 'Importer',
        refresh: 'Actualiser',
        loading: 'Chargement...',
        noData: 'Aucune donnée disponible',
        confirm: 'Confirmer',
        close: 'Fermer'
      }
    }
  },
  ar: {
    translation: {
      nav: {
        dashboard: 'لوحة القيادة',
        alerts: 'التنبيهات',
        rules: 'قواعد RA',
        domains: 'التحكم في المجال',
        revenue: 'تدفقات الإيرادات',
        users: 'إدارة المستخدمين',
        reports: 'التقارير',
        settings: 'الإعدادات'
      },
      header: {
        search: 'بحث...',
        notifications: 'الإشعارات',
        profile: 'الملف الشخصي',
        logout: 'تسجيل الخروج',
        darkMode: 'الوضع الداكن',
        lightMode: 'الوضع الفاتح',
        language: 'اللغة'
      },
      dashboard: {
        title: 'لوحة القيادة',
        totalAlerts: 'إجمالي التنبيهات',
        activeRules: 'القواعد النشطة',
        revenue: 'الإيرادات',
        users: 'إجمالي المستخدمين',
        recentAlerts: 'التنبيهات الأخيرة',
        performance: 'أداء النظام'
      },
      alerts: {
        title: 'إدارة التنبيهات',
        new: 'تنبيه جديد',
        filter: 'تصفية',
        export: 'تصدير',
        severity: 'الخطورة',
        status: 'الحالة',
        date: 'التاريخ',
        description: 'الوصف',
        actions: 'الإجراءات'
      },
      common: {
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        add: 'إضافة',
        search: 'بحث',
        filter: 'تصفية',
        export: 'تصدير',
        import: 'استيراد',
        refresh: 'تحديث',
        loading: 'جاري التحميل...',
        noData: 'لا توجد بيانات',
        confirm: 'تأكيد',
        close: 'إغلاق'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;