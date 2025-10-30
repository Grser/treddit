"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "es" | "en" | "ru";

export type LocaleStrings = {
  localeName: string;
  navbar: {
    brand: string;
    searchPlaceholder: string;
    languageLabel: string;
    ads: string;
    messages: string;
    notifications: string;
    create: string;
    createDisabled: string;
    login: string;
    register: string;
    logout: string;
    userGreeting: (username: string) => string;
    profile: string;
    admin: string;
  };
  authBanner: {
    title: string;
    description: string;
    register: string;
    login: string;
  };
  composer: {
    tabs: { text: string; media: string; poll: string };
    placeholderEnabled: string;
    placeholderDisabled: string;
    mediaPlaceholder: string;
    attachLabel: string;
    pollQuestion: string;
    pollOption: (index: number) => string;
    addOption: string;
    removeOption: string;
    pollDuration: string;
    errors: {
      needContent: string;
      uploadFailed: string;
      createFailed: string;
      pollInvalid: string;
      mediaEmpty: string;
    };
    submit: string;
    submitDisabledTitle: string;
  };
  feed: {
    loading: string;
    error: string;
    empty: string;
  };
  sidebarLeft: {
    home: string;
    popular: string;
    explore: string;
    communities: string;
    empty: string;
    createCommunity: string;
  };
  sidebarRight: {
    happening: string;
    seeAll: string;
    noTrends: string;
    whoToFollow: string;
    follow: string;
    followTitle: string;
    noSuggestions: string;
    followError: string;
    viewProfile: (username: string) => string;
  };
  comments: {
    loading: string;
    none: string;
    placeholder: string;
    replyPlaceholder: string;
    add: string;
    reply: string;
    send: string;
  };
  postActions: {
    comments: string;
    repost: string;
    undoRepost: string;
    login: string;
    like: string;
    unlike: string;
    views: string;
    saveComingSoon: string;
    share: string;
    linkCopied: string;
    copyPrompt: string;
  };
  postMenu: {
    more: string;
    edit: string;
    remove: string;
    pin: string;
    unpin: string;
    feature: string;
    changeReplies: string;
    embed: string;
    stats: string;
    failure: string;
  };
  postCard: {
    reposted: string;
    replyingTo: string;
  };
  poll: {
    voteFailed: string;
    votesLabel: (count: number) => string;
    hoursLabel: (count: number) => string;
    remaining: string;
  };
  pages: {
    search: { title: string; description: string };
    ads: { title: string; description: string };
    messages: { title: string; description: string };
    notifications: { title: string; description: string };
    explore: { title: string; description: string };
    people: { title: string; description: string };
    popular: { title: string; description: string };
  };
  badges: {
    verified: string;
    admin: string;
  };
  createCommunity: {
    title: string;
    subtitle: string;
    nameLabel: string;
    slugLabel: string;
    slugHelp: string;
    descriptionLabel: string;
    descriptionHelp: string;
    submit: string;
    success: string;
    error: string;
    existingTitle: string;
    existingSubtitle: string;
    empty: string;
    manage: string;
    roleOwner: string;
    roleModerator: string;
  };
  adminPage: {
    title: string;
    subtitle: string;
    statsTitle: string;
    quickLinks: string;
    stats: {
      users: string;
      posts: string;
      communities: string;
      moderators: string;
    };
    links: {
      users: { title: string; description: string };
      posts: { title: string; description: string };
      communities: { title: string; description: string };
      verification: { title: string; description: string };
    };
  };
};

const translations: Record<Locale, LocaleStrings> = {
  es: {
    localeName: "Español",
    navbar: {
      brand: "Treddit",
      searchPlaceholder: "Buscar en Treddit",
      languageLabel: "Idioma",
      ads: "Anuncios",
      messages: "Mensajes",
      notifications: "Notificaciones",
      create: "Crear",
      createDisabled: "Inicia sesión para publicar",
      login: "Entrar",
      register: "Registrar",
      logout: "Salir",
      userGreeting: (username) => `@${username}`,
      profile: "Mi perfil",
      admin: "Admin",
    },
    authBanner: {
      title: "Crea una cuenta o inicia sesión",
      description:
        "Puedes navegar sin cuenta, pero para comentar, dar me gusta o publicar necesitas iniciar sesión.",
      register: "Registrarse",
      login: "Iniciar sesión",
    },
    composer: {
      tabs: { text: "Texto", media: "Media", poll: "Encuesta" },
      placeholderEnabled: "¿Qué quieres compartir?",
      placeholderDisabled: "Inicia sesión para publicar",
      mediaPlaceholder: "URL de imagen o video (https://...)",
      attachLabel: "Adjunto",
      pollQuestion: "Pregunta",
      pollOption: (i) => `Opción ${i}`,
      addOption: "Añadir opción",
      removeOption: "Quitar opción",
      pollDuration: "Duración (días)",
      errors: {
        needContent: "Escribe algo para publicar.",
        uploadFailed: "No se pudo subir el archivo",
        createFailed: "No se pudo crear la publicación",
        pollInvalid: "La encuesta necesita una pregunta y al menos 2 opciones.",
        mediaEmpty: "Agrega texto o una imagen/video.",
      },
      submit: "Publicar",
      submitDisabledTitle: "Inicia sesión para publicar",
    },
    feed: {
      loading: "Cargando…",
      error: "No se pudieron cargar las publicaciones.",
      empty: "Aún no hay publicaciones.",
    },
    sidebarLeft: {
      home: "Inicio",
      popular: "Popular",
      explore: "Explorar",
      communities: "Comunidades",
      empty: "Sin datos",
      createCommunity: "Crear comunidad",
    },
    sidebarRight: {
      happening: "Qué está pasando",
      seeAll: "Ver todo",
      noTrends: "Sin tendencias por ahora",
      whoToFollow: "A quién seguir",
      follow: "Seguir",
      followTitle: "Seguir",
      noSuggestions: "Sin sugerencias",
      followError: "No se pudo seguir al usuario",
      viewProfile: (username) => `Ir al perfil de @${username}`,
    },
    comments: {
      loading: "Cargando comentarios…",
      none: "No hay comentarios aún.",
      placeholder: "Escribe un comentario",
      replyPlaceholder: "Tu respuesta",
      add: "Comentar",
      reply: "Responder",
      send: "Enviar",
    },
    postActions: {
      comments: "Comentarios",
      repost: "Repostear",
      undoRepost: "Quitar repost",
      login: "Inicia sesión",
      like: "Me gusta",
      unlike: "Quitar me gusta",
      views: "Vistas",
      saveComingSoon: "Guardar (próximamente)",
      share: "Compartir",
      linkCopied: "Enlace copiado",
      copyPrompt: "Copia el enlace",
    },
    postMenu: {
      more: "Más",
      edit: "Editar",
      remove: "Eliminar",
      pin: "Fijar en tu perfil",
      unpin: "Quitar de tu perfil",
      feature: "Destacar en tu perfil",
      changeReplies: "Cambiar quiénes pueden responder",
      embed: "Insertar post",
      stats: "Ver estadísticas de post",
      failure: "Operación fallida",
    },
    postCard: {
      reposted: "Reposteaste",
      replyingTo: "En respuesta a",
    },
    poll: {
      voteFailed: "No se pudo registrar tu voto",
      votesLabel: (count) => `${count} ${count === 1 ? "voto" : "votos"}`,
      hoursLabel: (count) => `${count} ${count === 1 ? "hora" : "horas"}`,
      remaining: "restantes",
    },
    pages: {
      search: {
        title: "Buscar",
        description: "Explora publicaciones, comunidades y personas usando el buscador.",
      },
      ads: {
        title: "Centro de anuncios",
        description: "Administra campañas y descubre oportunidades de promoción en Treddit.",
      },
      messages: {
        title: "Mensajes",
        description: "Mantente al día con tus conversaciones privadas.",
      },
      notifications: {
        title: "Notificaciones",
        description: "Revisa tus menciones, respuestas y alertas importantes.",
      },
      explore: {
        title: "Explorar",
        description: "Descubre tendencias, temas emergentes y comunidades destacadas.",
      },
      people: {
        title: "Personas",
        description: "Encuentra gente interesante para seguir y conecta con nuevas voces.",
      },
      popular: {
        title: "Popular",
        description: "Lo más relevante del día según la comunidad de Treddit.",
      },
    },
    badges: {
      verified: "Cuenta verificada",
      admin: "Administrador",
    },
    createCommunity: {
      title: "Crea tu comunidad",
      subtitle:
        "Agrupa a personas con tus mismos intereses. Escoge un nombre único y cuéntales de qué se trata.",
      nameLabel: "Nombre público",
      slugLabel: "Identificador",
      slugHelp: "Solo letras minúsculas, números y guiones. Será parte de la URL.",
      descriptionLabel: "Descripción",
      descriptionHelp: "Explica de qué trata y cuáles son las reglas básicas (máx. 280 caracteres).",
      submit: "Crear comunidad",
      success: "¡Comunidad creada!",
      error: "No se pudo crear la comunidad. Inténtalo de nuevo.",
      existingTitle: "Tus comunidades",
      existingSubtitle: "Administra las comunidades que moderas o has creado.",
      empty: "Todavía no administras ninguna comunidad.",
      manage: "Administrar",
      roleOwner: "Propietario",
      roleModerator: "Moderador",
    },
    adminPage: {
      title: "Panel de administración",
      subtitle: "Controla la actividad de la plataforma y responde a los reportes de la comunidad.",
      statsTitle: "Resumen rápido",
      quickLinks: "Accesos directos",
      stats: {
        users: "Usuarios activos",
        posts: "Publicaciones",
        communities: "Comunidades",
        moderators: "Moderadores",
      },
      links: {
        users: {
          title: "Gestionar usuarios",
          description: "Asigna o quita privilegios, revisa cuentas ocultas y gestiona verificaciones.",
        },
        posts: {
          title: "Revisar publicaciones",
          description: "Elimina contenido que infrinja las normas y supervisa reportes recientes.",
        },
        communities: {
          title: "Administrar comunidades",
          description: "Activa o desactiva comunidades y consulta sus estadísticas principales.",
        },
        verification: {
          title: "Verificación de perfiles",
          description: "Concede o retira la insignia verificada a los usuarios que lo soliciten.",
        },
      },
    },
  },
  en: {
    localeName: "English",
    navbar: {
      brand: "Treddit",
      searchPlaceholder: "Search Treddit",
      languageLabel: "Language",
      ads: "Ads",
      messages: "Messages",
      notifications: "Notifications",
      create: "Create",
      createDisabled: "Sign in to post",
      login: "Log in",
      register: "Sign up",
      logout: "Log out",
      userGreeting: (username) => `@${username}`,
      profile: "My profile",
      admin: "Admin",
    },
    authBanner: {
      title: "Create an account or sign in",
      description:
        "You can browse without an account, but you need to sign in to comment, like or publish.",
      register: "Sign up",
      login: "Log in",
    },
    composer: {
      tabs: { text: "Text", media: "Media", poll: "Poll" },
      placeholderEnabled: "What do you want to share?",
      placeholderDisabled: "Sign in to post",
      mediaPlaceholder: "Image or video URL (https://...)",
      attachLabel: "Attachment",
      pollQuestion: "Question",
      pollOption: (i) => `Option ${i}`,
      addOption: "Add option",
      removeOption: "Remove option",
      pollDuration: "Duration (days)",
      errors: {
        needContent: "Write something before posting.",
        uploadFailed: "File upload failed",
        createFailed: "Could not create the post",
        pollInvalid: "The poll needs a question and at least 2 options.",
        mediaEmpty: "Add text or an image/video.",
      },
      submit: "Post",
      submitDisabledTitle: "Sign in to post",
    },
    feed: {
      loading: "Loading…",
      error: "Posts could not be loaded.",
      empty: "No posts yet.",
    },
    sidebarLeft: {
      home: "Home",
      popular: "Popular",
      explore: "Explore",
      communities: "Communities",
      empty: "No data",
      createCommunity: "Create community",
    },
    sidebarRight: {
      happening: "What's happening",
      seeAll: "See all",
      noTrends: "No trends right now",
      whoToFollow: "Who to follow",
      follow: "Follow",
      followTitle: "Follow",
      noSuggestions: "No suggestions",
      followError: "Could not follow the user",
      viewProfile: (username) => `View @${username}'s profile`,
    },
    comments: {
      loading: "Loading comments…",
      none: "No comments yet.",
      placeholder: "Write a comment",
      replyPlaceholder: "Your reply",
      add: "Comment",
      reply: "Reply",
      send: "Send",
    },
    postActions: {
      comments: "Comments",
      repost: "Repost",
      undoRepost: "Undo repost",
      login: "Sign in",
      like: "Like",
      unlike: "Unlike",
      views: "Views",
      saveComingSoon: "Save (coming soon)",
      share: "Share",
      linkCopied: "Link copied",
      copyPrompt: "Copy the link",
    },
    postMenu: {
      more: "More",
      edit: "Edit",
      remove: "Delete",
      pin: "Pin to your profile",
      unpin: "Unpin from your profile",
      feature: "Feature on your profile",
      changeReplies: "Change who can reply",
      embed: "Embed post",
      stats: "View post stats",
      failure: "Operation failed",
    },
    postCard: {
      reposted: "You reposted",
      replyingTo: "Replying to",
    },
    poll: {
      voteFailed: "Your vote could not be recorded",
      votesLabel: (count) => `${count} ${count === 1 ? "vote" : "votes"}`,
      hoursLabel: (count) => `${count} ${count === 1 ? "hour" : "hours"}`,
      remaining: "left",
    },
    pages: {
      search: {
        title: "Search",
        description: "Explore posts, communities and people using the search bar.",
      },
      ads: {
        title: "Ads center",
        description: "Manage campaigns and discover promotion opportunities on Treddit.",
      },
      messages: {
        title: "Messages",
        description: "Keep up with your private conversations.",
      },
      notifications: {
        title: "Notifications",
        description: "Review mentions, replies and important alerts.",
      },
      explore: {
        title: "Explore",
        description: "Discover trends, emerging topics and featured communities.",
      },
      people: {
        title: "People",
        description: "Find interesting accounts to follow and connect with new voices.",
      },
      popular: {
        title: "Popular",
        description: "The most relevant content today according to the Treddit community.",
      },
    },
    badges: {
      verified: "Verified account",
      admin: "Administrator",
    },
    createCommunity: {
      title: "Create your community",
      subtitle: "Bring people together around your interests. Pick a unique name and explain what it's about.",
      nameLabel: "Display name",
      slugLabel: "Identifier",
      slugHelp: "Lowercase letters, numbers and dashes only. It becomes part of the URL.",
      descriptionLabel: "Description",
      descriptionHelp: "Tell people what to expect and outline the basic rules (max. 280 characters).",
      submit: "Create community",
      success: "Community created!",
      error: "The community could not be created. Try again.",
      existingTitle: "Your communities",
      existingSubtitle: "Manage the communities you moderate or created.",
      empty: "You don't manage any communities yet.",
      manage: "Manage",
      roleOwner: "Owner",
      roleModerator: "Moderator",
    },
    adminPage: {
      title: "Admin dashboard",
      subtitle: "Monitor platform activity and respond to community reports.",
      statsTitle: "At a glance",
      quickLinks: "Quick actions",
      stats: {
        users: "Active users",
        posts: "Posts",
        communities: "Communities",
        moderators: "Moderators",
      },
      links: {
        users: {
          title: "Manage users",
          description: "Assign privileges, review hidden accounts and handle verification.",
        },
        posts: {
          title: "Review posts",
          description: "Remove rule-breaking content and follow up on recent reports.",
        },
        communities: {
          title: "Moderate communities",
          description: "Enable or disable communities and inspect key stats.",
        },
        verification: {
          title: "Profile verification",
          description: "Grant or revoke the verified badge for trusted accounts.",
        },
      },
    },
  },
  ru: {
    localeName: "Русский",
    navbar: {
      brand: "Treddit",
      searchPlaceholder: "Поиск по Treddit",
      languageLabel: "Язык",
      ads: "Реклама",
      messages: "Сообщения",
      notifications: "Уведомления",
      create: "Создать",
      createDisabled: "Войдите, чтобы публиковать",
      login: "Войти",
      register: "Регистрация",
      logout: "Выйти",
      userGreeting: (username) => `@${username}`,
      profile: "Мой профиль",
      admin: "Админ",
    },
    authBanner: {
      title: "Создайте аккаунт или войдите",
      description:
        "Вы можете просматривать ленту без аккаунта, но для комментариев, лайков и публикаций нужно войти.",
      register: "Зарегистрироваться",
      login: "Войти",
    },
    composer: {
      tabs: { text: "Текст", media: "Медиа", poll: "Опрос" },
      placeholderEnabled: "Чем хотите поделиться?",
      placeholderDisabled: "Войдите, чтобы публиковать",
      mediaPlaceholder: "Ссылка на изображение или видео (https://...)",
      attachLabel: "Вложение",
      pollQuestion: "Вопрос",
      pollOption: (i) => `Вариант ${i}`,
      addOption: "Добавить вариант",
      removeOption: "Удалить вариант",
      pollDuration: "Длительность (дни)",
      errors: {
        needContent: "Напишите что-нибудь перед публикацией.",
        uploadFailed: "Не удалось загрузить файл",
        createFailed: "Не удалось создать публикацию",
        pollInvalid: "Опрос требует вопрос и минимум 2 варианта.",
        mediaEmpty: "Добавьте текст или изображение/видео.",
      },
      submit: "Опубликовать",
      submitDisabledTitle: "Войдите, чтобы публиковать",
    },
    feed: {
      loading: "Загрузка…",
      error: "Не удалось загрузить публикации.",
      empty: "Публикаций пока нет.",
    },
    sidebarLeft: {
      home: "Главная",
      popular: "Популярное",
      explore: "Обзор",
      communities: "Сообщества",
      empty: "Нет данных",
      createCommunity: "Создать сообщество",
    },
    sidebarRight: {
      happening: "Что происходит",
      seeAll: "Показать все",
      noTrends: "Пока нет трендов",
      whoToFollow: "Кого читать",
      follow: "Читать",
      followTitle: "Читать",
      noSuggestions: "Нет рекомендаций",
      followError: "Не удалось подписаться на пользователя",
      viewProfile: (username) => `Перейти в профиль @${username}`,
    },
    comments: {
      loading: "Загрузка комментариев…",
      none: "Комментариев пока нет.",
      placeholder: "Напишите комментарий",
      replyPlaceholder: "Ваш ответ",
      add: "Комментировать",
      reply: "Ответить",
      send: "Отправить",
    },
    postActions: {
      comments: "Комментарии",
      repost: "Репост",
      undoRepost: "Отменить репост",
      login: "Войдите",
      like: "Нравится",
      unlike: "Убрать лайк",
      views: "Просмотры",
      saveComingSoon: "Сохранить (скоро)",
      share: "Поделиться",
      linkCopied: "Ссылка скопирована",
      copyPrompt: "Скопируйте ссылку",
    },
    postMenu: {
      more: "Ещё",
      edit: "Редактировать",
      remove: "Удалить",
      pin: "Закрепить в профиле",
      unpin: "Открепить от профиля",
      feature: "Выделить в профиле",
      changeReplies: "Изменить, кто может отвечать",
      embed: "Встроить пост",
      stats: "Статистика поста",
      failure: "Ошибка операции",
    },
    postCard: {
      reposted: "Вы сделали репост",
      replyingTo: "В ответ",
    },
    poll: {
      voteFailed: "Не удалось сохранить ваш голос",
      votesLabel: (count) => `${count} ${count === 1 ? "голос" : count >= 2 && count <= 4 ? "голоса" : "голосов"}`,
      hoursLabel: (count) => `${count} ${count === 1 ? "час" : count >= 2 && count <= 4 ? "часа" : "часов"}`,
      remaining: "осталось",
    },
    pages: {
      search: {
        title: "Поиск",
        description: "Ищите публикации, сообщества и людей через строку поиска.",
      },
      ads: {
        title: "Рекламный центр",
        description: "Управляйте кампаниями и находите возможности продвижения в Treddit.",
      },
      messages: {
        title: "Сообщения",
        description: "Следите за личными переписками.",
      },
      notifications: {
        title: "Уведомления",
        description: "Проверяйте упоминания, ответы и важные оповещения.",
      },
      explore: {
        title: "Обзор",
        description: "Открывайте тренды, новые темы и интересные сообщества.",
      },
      people: {
        title: "Люди",
        description: "Находите интересных авторов и подписывайтесь на новые голоса.",
      },
      popular: {
        title: "Популярное",
        description: "Самые обсуждаемые материалы дня по версии сообщества Treddit.",
      },
    },
    badges: {
      verified: "Подтвержденный аккаунт",
      admin: "Администратор",
    },
    createCommunity: {
      title: "Создайте сообщество",
      subtitle: "Объедините людей с похожими интересами. Выберите уникальное имя и расскажите, о чем оно.",
      nameLabel: "Публичное название",
      slugLabel: "Идентификатор",
      slugHelp: "Только строчные буквы, цифры и дефисы. Значение используется в URL.",
      descriptionLabel: "Описание",
      descriptionHelp: "Опишите тематику и основные правила (до 280 символов).",
      submit: "Создать сообщество",
      success: "Сообщество создано!",
      error: "Не удалось создать сообщество. Попробуйте ещё раз.",
      existingTitle: "Ваши сообщества",
      existingSubtitle: "Управляйте сообществами, которые вы модерируете или создали.",
      empty: "У вас пока нет сообществ в управлении.",
      manage: "Управлять",
      roleOwner: "Владелец",
      roleModerator: "Модератор",
    },
    adminPage: {
      title: "Панель администратора",
      subtitle: "Следите за активностью платформы и реагируйте на жалобы сообщества.",
      statsTitle: "Краткая сводка",
      quickLinks: "Быстрые действия",
      stats: {
        users: "Активные пользователи",
        posts: "Публикации",
        communities: "Сообщества",
        moderators: "Модераторы",
      },
      links: {
        users: {
          title: "Управление пользователями",
          description: "Назначайте права, просматривайте скрытые аккаунты и ведите верификацию.",
        },
        posts: {
          title: "Проверка публикаций",
          description: "Удаляйте материалы, нарушающие правила, и отслеживайте жалобы.",
        },
        communities: {
          title: "Администрирование сообществ",
          description: "Включайте или скрывайте сообщества и просматривайте ключевые показатели.",
        },
        verification: {
          title: "Верификация профилей",
          description: "Выдавайте или снимайте значок подтверждения с доверенных аккаунтов.",
        },
      },
    },
  },
};

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  strings: LocaleStrings;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const STORAGE_KEY = "treddit_locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && stored in translations) {
      setLocaleState(stored);
    } else {
      const browserLang = window.navigator.language.slice(0, 2);
      if (browserLang === "en" || browserLang === "ru") {
        setLocaleState(browserLang);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (loc) => {
        if (translations[loc]) {
          setLocaleState(loc);
        }
      },
      strings: translations[locale],
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export const supportedLocales: { code: Locale; label: string }[] = [
  { code: "es", label: translations.es.localeName },
  { code: "en", label: translations.en.localeName },
  { code: "ru", label: translations.ru.localeName },
];

