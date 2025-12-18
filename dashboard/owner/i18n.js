// Extracted from dashboard/index.html for maintainability.

export const i18nStrings = {

  en: {

    app_title: "AI Telephony Dashboard",

    app_tagline: "Owner Command Center",

    locale_label: "Language",

    locale_en: "English",

    locale_es: "Espa\u00f1ol",

    status_connecting: "Connecting...",

    status_connected: "Connected",

    status_error: "Connection Error",

    theme_dark: "Dark Mode",

    theme_light: "Light Mode",

    refresh_all: "Refresh All",

    refresh: "Refresh",

    access_eyebrow: "Access",

    settings_title: "Settings & Integrations",

    settings_subtitle: "Save your tokens and verify key connections.",

    owner_auth_title: "Owner Authentication",

    tenant_api_key_label: "Tenant API Key (X-API-Key)",

    tenant_api_key_placeholder: "Enter your tenant API key",

    owner_token_label: "Owner Token (X-Owner-Token)",

    owner_token_placeholder: "Enter your owner dashboard token",

    business_id_label: "Business ID (X-Business-ID)",

    business_id_placeholder: "Enter a business ID",

    apply: "Apply",

    clear: "Clear",

    business_hint: "Switch between businesses without changing API keys (requires role access).",

    integration_title: "Integration Status",

    integration_loading: "Loading integrations",

    integration_empty: "No integration data",

    integration_connected: "Connected",

    integration_disconnected: "Not connected",

    overview_eyebrow: "Overview",

    overview_title: "Owner Dashboard",

    overview_subtitle: "Bookings, revenue signals, and assistant tips at a glance.",

    kpi_title: "Key Performance Indicators",

    kpi_loading: "Loading KPIs",

    kpi_refresh: "Refresh KPIs",

    kpi_empty: "No KPI data yet",

    kpi_unable: "Unable to load KPIs",

    kpi_conversion: "Conversion",

    kpi_avg_time: "Avg Time to Book",

    kpi_repeat: "Repeat Work",

    kpi_sms: "SMS Confirms",

    kpi_data_complete: "Data Complete",

    today_title: "Today's Jobs",

    today_loading: "Loading",

    today_refresh: "Refresh",

    today_total: "Total Jobs",

    today_emergency: "Emergency Jobs",

    today_standard: "Standard Jobs",

    today_unable: "Unable to load summary",

    schedule_title: "Tomorrow's Schedule",

    schedule_loading: "Loading schedule...",

    schedule_refresh: "Refresh Schedule",

    schedule_empty: "No appointments scheduled for tomorrow",

    schedule_unable: "Unable to load schedule",

    schedule_fallback: "You have {count} appointments scheduled for tomorrow.",

    tag_emergency: "emergency",

    tag_normal: "normal",

    emergencies_title: "Emergency Jobs",

    emergencies_loading: "Loading",

    emergencies_refresh: "Refresh",

    emergencies_today: "Today",

    emergencies_last7: "Last 7 Days",

    emergencies_last30: "Last 30 Days",

    emergencies_unable: "Unable to load emergency data",

    analytics_title: "Analytics Overview",

    analytics_loading: "Loading",

    analytics_refresh: "Refresh",

    analytics_download_csv: "Download CSV",

    analytics_total: "Appointments (Last 30 Days)",

    analytics_emergency_share: "Emergency Share (30 Days)",

    analytics_repeat_share: "Repeat Work Share",

    analytics_conversion: "Lead to Booked Conversion",

    analytics_unable: "Unable to load analytics",

    calendar_title: "90-Day Calendar (Tags)",

    calendar_loading: "Loading",

    calendar_legend_emergency: "Emergency",

    calendar_legend_maintenance: "Maintenance",

    calendar_legend_routine: "Routine",

    calendar_legend_new_client: "New client",

    calendar_locked: "Upgrade to the Growth plan ($100/mo) to unlock the 90-day calendar.",

    calendar_empty: "No appointments in the next 90 days",

    calendar_unable: "Unable to load 90-day calendar",

    calendar_jobs_single: "1 job",

    calendar_jobs_plural: "{count} jobs",

    calendar_modal_title_prefix: "Schedule report for",

    calendar_modal_empty: "No appointments scheduled for this day",

    calendar_modal_overview: "Overview",

    calendar_modal_by_tag: "By tag",

    calendar_modal_by_service: "By service type",

    calendar_modal_no_tag: "No tag data",

    calendar_modal_no_service: "No service-type data",

    calendar_modal_download: "Download PDF",

    calendar_modal_close: "Close",

    calendar_modal_total_jobs: "Total jobs",

    calendar_modal_new_customers: "New customers",

    calendar_modal_est_value: "Estimated value",

    calendar_modal_avg_label: "avg",

    zip_title: "Market by ZIP (Wealth & Value)",

    zip_loading: "Loading",

    zip_locked: "Upgrade to the Growth plan ($100/mo) to unlock market-by-ZIP analytics.",

    zip_empty: "No ZIP-level data available yet",

    zip_unable: "Unable to load ZIP/wealth data",

    zip_unknown: "Unknown",

    zip_band_low: "< $50k",

    zip_band_mid: "$50k - $80k",

    zip_band_high: "\u2265 $80k",

    zip_no_income: "No income data",

    zip_jobs_value: "Jobs: {jobs} \u00b7 Value: ${value}",

    service_metrics_title: "Service Metrics (Price & Time)",

    service_metrics_loading: "Loading",

    service_metrics_locked: "Upgrade to the Growth plan ($100/mo) to unlock detailed service metrics.",

    service_metrics_empty: "No service metrics available yet",

    service_metrics_unable: "Unable to load service metrics",

    service_metrics_jobs_price: "Jobs: {jobs} . Avg Price: ${price}",

    service_metrics_avg_price: "Avg Price",

    service_metrics_avg_time: "Avg Time",

    service_metrics_range: "Range",

    service_metrics_unspecified: "(unspecified)",

    service_map_title: "Service Map (last 30 days)",

    ai_tips_title: "AI Assistant & Tips",

    ai_tips_intro: "Ask the owner assistant for real-time answers, or start with these shortcuts.",

    ai_tip_one: "\"What emergencies are pending today and who's assigned?\"",

    ai_tip_two: "\"Summarize bookings and revenue this week vs last week.\"",

    ai_tip_three: "\"Who are my top repeat customers in the last 90 days?\"",

    ai_tip_open: "Open assistant",

    ai_tip_view_conversations: "View conversations",

    conversations_title: "Recent Conversations",

    conversations_loading: "Loading",

    conversations_refresh: "Refresh",

    conversations_download: "Download CSV",

    conversations_empty: "No flagged or emergency conversations",

    conversations_unable: "Unable to load conversations",

    conversations_unknown_customer: "Unknown customer",

    conversations_channel: "Channel",

    conversations_created: "Created",

    mobile_dashboard: "Dashboard",

    mobile_schedule: "Schedule",

    mobile_chat: "Chat",

    mobile_settings: "Settings",

    modal_title: "Schedule report",

    modal_subtitle: "90-day calendar tags summarized for the selected day.",

    modal_download: "Download PDF",

    modal_close_btn: "Close",

    assistant_toggle: "Ask the dashboard",

    assistant_title: "AI Owner Assistant",

    assistant_subtitle: "Ask about metrics, data, policies, or support.",

    assistant_system_prompt: "Ask me about today's jobs, emergency volume, service metrics, your customers, or privacy and security policies.",

    assistant_placeholder: "Ask a question about this dashboard, your metrics, data, policies, or support...",

    assistant_send: "Ask",

    assistant_poc_notice: "The owner assistant is optimized for Growth and Scale plans; you can still try it in this proof of concept.",

    assistant_thinking: "Thinking...",

    assistant_unreachable: "Unable to reach assistant",

    assistant_unavailable: "Assistant unavailable.",

    assistant_limited: "The owner assistant is a Growth/Scale feature; responses may be limited in Starter.",

    loading_generic: "Loading",

    loading_preparing_report: "Preparing report...",

    owner_token_saved: "Owner token saved",

    owner_token_cleared: "Owner token cleared",

    api_key_saved: "API key saved",

    api_key_cleared: "API key cleared",

    business_set: "Business set: {id}",

    business_cleared: "Business cleared",

    plan_label: "Plan: {plan}",

    map_loading: "Loading map markers...",

    map_empty: "No geocoded appointments yet.",

    map_unknown_area: "Unknown area",

    map_service: "service",

    map_emergency: "(emergency)",

    map_locations: "{count} locations mapped",

    map_unable: "Unable to load map data",

    upgrade_growth_map: "Upgrade to the Growth plan ($100/mo) to unlock the 90-day calendar."

  },

  es: {

    app_title: "Panel de telefon\u00eda con IA",

    app_tagline: "Centro de control del propietario",

    locale_label: "Idioma",

    locale_en: "Ingl\u00e9s",

    locale_es: "Espa\u00f1ol",

    status_connecting: "Conectando...",

    status_connected: "Conectado",

    status_error: "Error de conexi\u00f3n",

    theme_dark: "Modo oscuro",

    theme_light: "Modo claro",

    refresh_all: "Actualizar todo",

    refresh: "Actualizar",

    access_eyebrow: "Acceso",

    settings_title: "Configuraci\u00f3n e integraciones",

    settings_subtitle: "Guarda tus tokens y verifica las conexiones clave.",

    owner_auth_title: "Autenticaci\u00f3n del propietario",

    tenant_api_key_label: "Clave de API del inquilino (X-API-Key)",

    tenant_api_key_placeholder: "Ingresa tu API key del inquilino",

    owner_token_label: "Token del propietario (X-Owner-Token)",

    owner_token_placeholder: "Ingresa tu token del propietario",

    business_id_label: "ID del negocio (X-Business-ID)",

    business_id_placeholder: "Ingresa un ID de negocio",

    apply: "Aplicar",

    clear: "Limpiar",

    business_hint: "Cambia entre negocios sin modificar las API keys (requiere permisos).",

    integration_title: "Estado de integraciones",

    integration_loading: "Cargando integraciones",

    integration_empty: "Sin datos de integraciones",

    integration_connected: "Conectado",

    integration_disconnected: "No conectado",

    overview_eyebrow: "Resumen",

    overview_title: "Panel del propietario",

    overview_subtitle: "Reservas, se\u00f1ales de ingresos y sugerencias del asistente en un vistazo.",

    kpi_title: "Indicadores clave",

    kpi_loading: "Cargando KPIs",

    kpi_refresh: "Actualizar KPIs",

    kpi_empty: "A\u00fan no hay KPIs",

    kpi_unable: "No se pudieron cargar los KPIs",

    kpi_conversion: "Conversi\u00f3n",

    kpi_avg_time: "Tiempo promedio para agendar",

    kpi_repeat: "Trabajo recurrente",

    kpi_sms: "Confirmaciones por SMS",

    kpi_data_complete: "Datos completos",

    today_title: "Trabajos de hoy",

    today_loading: "Cargando",

    today_refresh: "Actualizar",

    today_total: "Trabajos totales",

    today_emergency: "Trabajos de emergencia",

    today_standard: "Trabajos est\u00e1ndar",

    today_unable: "No se pudo cargar el resumen",

    schedule_title: "Agenda de ma\u00f1ana",

    schedule_loading: "Cargando agenda...",

    schedule_refresh: "Actualizar agenda",

    schedule_empty: "No hay citas programadas para ma\u00f1ana",

    schedule_unable: "No se pudo cargar la agenda",

    schedule_fallback: "Tienes {count} citas programadas para ma\u00f1ana.",

    tag_emergency: "emergencia",

    tag_normal: "normal",

    emergencies_title: "Trabajos de emergencia",

    emergencies_loading: "Cargando",

    emergencies_refresh: "Actualizar",

    emergencies_today: "Hoy",

    emergencies_last7: "\u00daltimos 7 d\u00edas",

    emergencies_last30: "\u00daltimos 30 d\u00edas",

    emergencies_unable: "No se pudieron cargar los datos de emergencia",

    analytics_title: "Resumen anal\u00edtico",

    analytics_loading: "Cargando",

    analytics_refresh: "Actualizar",

    analytics_download_csv: "Descargar CSV",

    analytics_total: "Citas (30 d\u00edas)",

    analytics_emergency_share: "Proporci\u00f3n de emergencias (30 d\u00edas)",

    analytics_repeat_share: "Proporci\u00f3n de trabajo recurrente",

    analytics_conversion: "Conversi\u00f3n de lead a reserva",

    analytics_unable: "No se pudo cargar anal\u00edtica",

    calendar_title: "Calendario de 90 d\u00edas (etiquetas)",

    calendar_loading: "Cargando",

    calendar_legend_emergency: "Emergencia",

    calendar_legend_maintenance: "Mantenimiento",

    calendar_legend_routine: "Rutina",

    calendar_legend_new_client: "Cliente nuevo",

    calendar_locked: "Actualiza al plan Growth ($100/mes) para ver el calendario de 90 d\u00edas.",

    calendar_empty: "No hay citas en los pr\u00f3ximos 90 d\u00edas",

    calendar_unable: "No se pudo cargar el calendario de 90 d\u00edas",

    calendar_jobs_single: "1 trabajo",

    calendar_jobs_plural: "{count} trabajos",

    calendar_modal_title_prefix: "Informe de agenda para",

    calendar_modal_empty: "No hay citas programadas para este d\u00eda",

    calendar_modal_overview: "Resumen",

    calendar_modal_by_tag: "Por etiqueta",

    calendar_modal_by_service: "Por tipo de servicio",

    calendar_modal_no_tag: "Sin datos de etiquetas",

    calendar_modal_no_service: "Sin datos por servicio",

    calendar_modal_download: "Descargar PDF",

    calendar_modal_close: "Cerrar",

    calendar_modal_total_jobs: "Trabajos totales",

    calendar_modal_new_customers: "Clientes nuevos",

    calendar_modal_est_value: "Valor estimado",

    calendar_modal_avg_label: "prom.",

    zip_title: "Mercado por c\u00f3digo postal (riqueza y valor)",

    zip_loading: "Cargando",

    zip_locked: "Actualiza al plan Growth ($100/mes) para ver la anal\u00edtica por c\u00f3digo postal.",

    zip_empty: "A\u00fan no hay datos a nivel de c\u00f3digo postal",

    zip_unable: "No se pudieron cargar los datos por c\u00f3digo postal",

    zip_unknown: "Desconocido",

    zip_band_low: "< $50k",

    zip_band_mid: "$50k - $80k",

    zip_band_high: "\u2265 $80k",

    zip_no_income: "Sin datos de ingresos",

    zip_jobs_value: "Trabajos: {jobs} \u00b7 Valor: ${value}",

    service_metrics_title: "M\u00e9tricas de servicio (precio y tiempo)",

    service_metrics_loading: "Cargando",

    service_metrics_locked: "Actualiza al plan Growth ($100/mes) para ver m\u00e9tricas de servicio detalladas.",

    service_metrics_empty: "A\u00fan no hay m\u00e9tricas de servicio",

    service_metrics_unable: "No se pudieron cargar las m\u00e9tricas de servicio",

    service_metrics_jobs_price: "Trabajos: {jobs} \u00b7 Precio prom.: ${price}",

    service_metrics_avg_price: "Precio prom.",

    service_metrics_avg_time: "Tiempo prom.",

    service_metrics_range: "Rango",

    service_metrics_unspecified: "(sin especificar)",

    service_map_title: "Mapa de servicio (\u00faltimos 30 d\u00edas)",

    ai_tips_title: "Asistente de IA y sugerencias",

    ai_tips_intro: "Pregunta al asistente en tiempo real o empieza con estos accesos directos.",

    ai_tip_one: "\"\u00bfQu\u00e9 emergencias est\u00e1n pendientes hoy y qui\u00e9n las tiene asignadas?\"",

    ai_tip_two: "\"Resume reservas e ingresos de esta semana vs la pasada.\"",

    ai_tip_three: "\"\u00bfQui\u00e9nes son mis mejores clientes recurrentes en los \u00faltimos 90 d\u00edas?\"",

    ai_tip_open: "Abrir asistente",

    ai_tip_view_conversations: "Ver conversaciones",

    conversations_title: "Conversaciones recientes",

    conversations_loading: "Cargando",

    conversations_refresh: "Actualizar",

    conversations_download: "Descargar CSV",

    conversations_empty: "No hay conversaciones marcadas o de emergencia",

    conversations_unable: "No se pudieron cargar las conversaciones",

    conversations_unknown_customer: "Cliente desconocido",

    conversations_channel: "Canal",

    conversations_created: "Creado",

    mobile_dashboard: "Panel",

    mobile_schedule: "Agenda",

    mobile_chat: "Chat",

    mobile_settings: "Ajustes",

    modal_title: "Informe de agenda",

    modal_subtitle: "Etiquetas del calendario de 90 d\u00edas resumidas para el d\u00eda seleccionado.",

    modal_download: "Descargar PDF",

    modal_close_btn: "Cerrar",

    assistant_toggle: "Preg\u00fantale al panel",

    assistant_title: "Asistente del propietario",

    assistant_subtitle: "Pregunta sobre m\u00e9tricas, datos, pol\u00edticas o soporte.",

    assistant_system_prompt: "Preg\u00fantame sobre los trabajos de hoy, volumen de emergencias, m\u00e9tricas de servicio, tus clientes o pol\u00edticas de privacidad y seguridad.",

    assistant_placeholder: "Haz una pregunta sobre este panel, tus m\u00e9tricas, datos, pol\u00edticas o soporte...",

    assistant_send: "Preguntar",

    assistant_poc_notice: "El asistente est\u00e1 optimizado para los planes Growth y Scale; a\u00fan puedes probarlo en este piloto.",

    assistant_thinking: "Pensando...",

    assistant_unreachable: "No se pudo contactar al asistente",

    assistant_unavailable: "Asistente no disponible.",

    assistant_limited: "El asistente es una funci\u00f3n de Growth/Scale; las respuestas pueden ser limitadas en Starter.",

    loading_generic: "Cargando",

    loading_preparing_report: "Preparando informe...",

    owner_token_saved: "Token del propietario guardado",

    owner_token_cleared: "Token del propietario eliminado",

    api_key_saved: "API key guardada",

    api_key_cleared: "API key eliminada",

    business_set: "Negocio seleccionado: {id}",

    business_cleared: "Negocio eliminado",

    plan_label: "Plan: {plan}",

    map_loading: "Cargando marcadores del mapa...",

    map_empty: "A\u00fan no hay citas geocodificadas.",

    map_unknown_area: "Zona desconocida",

    map_service: "servicio",

    map_emergency: "(emergencia)",

    map_locations: "{count} ubicaciones en el mapa",

    map_unable: "No se pudieron cargar los datos del mapa",

    upgrade_growth_map: "Actualiza al plan Growth ($100/mes) para ver el calendario de 90 d\u00edas."

  },

};

