import React, { useState } from 'react';
import {
  Globe, LayoutDashboard, Ticket, FolderKanban, CalendarRange, CheckSquare,
  Bot, LayoutTemplate, Bell, BarChart3, Settings, ChevronDown, ChevronRight,
  BookOpen,
} from 'lucide-react';

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: 'intro',
    icon: <Globe className="w-5 h-5 text-emerald-600" />,
    title: 'Introduzione a GISdesk',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          GISdesk è un sistema di helpdesk e project management sviluppato da studiogis.eu, pensato per team che gestiscono
          richieste di supporto, progetti GIS e attività operative.
        </p>
        <p>
          Il sistema permette di creare ticket di supporto, gestire progetti con relative milestone, assegnare attività
          (TODO), monitorare i tempi di lavoro e comunicare via commenti e notifiche.
        </p>
        <p>
          Esiste una distinzione tra due ruoli principali: <strong>Admin</strong>, che ha accesso completo a tutte le funzionalità
          incluse statistiche e impostazioni, e <strong>Client</strong>, che può creare e visualizzare ticket dei propri progetti.
        </p>
      </div>
    ),
  },
  {
    id: 'dashboard',
    icon: <LayoutDashboard className="w-5 h-5 text-emerald-600" />,
    title: 'Dashboard',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          La Dashboard è la prima schermata dopo il login. Mostra un riepilogo immediato della situazione:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Numero totale di progetti, ticket, ticket aperti e ticket critici</li>
          <li>Distribuzione dei ticket per stato (Aperto, In Corso, In Attesa, Risolto, Chiuso)</li>
          <li>Distribuzione dei ticket per priorità (Bassa, Media, Alta, Critica)</li>
          <li>Lista degli ultimi 10 ticket creati con stato e priorità</li>
        </ul>
        <p>
          Gli utenti Admin vedono le statistiche globali. Gli utenti Client vedono i dati relativi ai propri progetti.
        </p>
      </div>
    ),
  },
  {
    id: 'tickets',
    icon: <Ticket className="w-5 h-5 text-emerald-600" />,
    title: 'Ticket',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          I ticket sono il cuore del sistema. Per creare un ticket vai nella sezione Ticket e clicca su "Nuovo Ticket".
        </p>
        <p><strong>Campi principali:</strong></p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li><strong>Titolo</strong>: descrizione breve del problema</li>
          <li><strong>Progetto</strong>: a quale progetto appartiene il ticket</li>
          <li><strong>Priorità</strong>: Bassa, Media, Alta, Critica, Feature Request</li>
          <li><strong>Tipo</strong>: Standard o Servizio</li>
          <li><strong>Descrizione</strong>: dettaglio del problema</li>
        </ul>
        <p><strong>Stati del ticket:</strong> Aperto → In Corso → In Attesa → Risolto → Chiuso</p>
        <p>
          <strong>SLA (Service Level Agreement):</strong> ogni progetto ha un numero di ore SLA. Quando scade, il ticket viene
          evidenziato in arancione (in scadenza) o rosso (scaduto). Gli admin ricevono notifiche email automatiche.
        </p>
        <p>
          All'interno di un ticket puoi: aggiungere commenti (con @menzioni di altri utenti), allegare file,
          registrare ore di lavoro, vedere la cronologia delle modifiche e gestire dipendenze tra ticket.
        </p>
      </div>
    ),
  },
  {
    id: 'projects',
    icon: <FolderKanban className="w-5 h-5 text-emerald-600" />,
    title: 'Progetti',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          I progetti sono contenitori che raggruppano ticket, attività, documenti e allegati. Solo gli Admin possono creare
          e gestire i progetti.
        </p>
        <p><strong>Tab disponibili nella pagina di dettaglio progetto:</strong></p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li><strong>Panoramica</strong>: info generali, date, stato, SLA configurato</li>
          <li><strong>Ticket</strong>: lista e gestione dei ticket del progetto</li>
          <li><strong>Cronoprogramma</strong>: vista Gantt delle attività pianificate</li>
          <li><strong>TODO</strong>: lista di task con scadenze e ricorrenze</li>
          <li><strong>FAQ</strong>: domande e risposte frequenti del progetto</li>
          <li><strong>Documenti</strong>: documenti testuali interni</li>
          <li><strong>Allegati</strong>: file caricati nel progetto</li>
          <li><strong>Membri</strong>: gestione dei partecipanti al progetto</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'gantt',
    icon: <CalendarRange className="w-5 h-5 text-emerald-600" />,
    title: 'Cronoprogramma Gantt',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          Il Cronoprogramma Gantt ti permette di visualizzare e pianificare le attività del progetto su una timeline.
        </p>
        <p><strong>Funzionalità:</strong></p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Crea elementi timeline con data di inizio e fine</li>
          <li>Collega una voce del Gantt a un TODO esistente per sincronizzare lo stato di completamento</li>
          <li>Personalizza il colore di ogni barra per categorizzare visivamente le attività</li>
          <li>Aggiorna la percentuale di avanzamento (0-100%) di ogni voce</li>
          <li>Trascina o modifica le date direttamente dalla vista Gantt</li>
        </ul>
        <p>
          Gli stati disponibili per le voci timeline sono: Da Fare, In Corso, Completato. Il colore della barra
          riflette sia lo stato che il colore personalizzato scelto.
        </p>
      </div>
    ),
  },
  {
    id: 'todos',
    icon: <CheckSquare className="w-5 h-5 text-emerald-600" />,
    title: 'TODO',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          I TODO sono attività semplici associate a un progetto. Possono essere assegnati a un utente specifico
          e avere una data di scadenza.
        </p>
        <p><strong>Ricorrenze disponibili:</strong></p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Nessuna (task singolo)</li>
          <li>Giornaliera</li>
          <li>Settimanale</li>
          <li>Mensile</li>
        </ul>
        <p>
          Un TODO può essere collegato a una voce del Gantt. Quando si completa il TODO, la voce corrispondente
          nel cronoprogramma viene aggiornata automaticamente.
        </p>
      </div>
    ),
  },
  {
    id: 'ai',
    icon: <Bot className="w-5 h-5 text-emerald-600" />,
    title: 'FAQ & AI Assistant',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          Ogni progetto ha una sezione FAQ dove gli Admin possono inserire domande e risposte frequenti
          per guidare i clienti.
        </p>
        <p>
          L'AI Assistant è disponibile nella pagina di dettaglio del progetto. Puoi fargli domande in linguaggio
          naturale riguardo al progetto, ai ticket o alle procedure. L'AI risponde basandosi sulle FAQ configurate
          e sul contesto del progetto.
        </p>
        <p>
          La funzionalità AI richiede una chiave API OpenAI configurata dall'amministratore.
          In assenza della chiave, il pulsante AI non sarà disponibile.
        </p>
      </div>
    ),
  },
  {
    id: 'templates',
    icon: <LayoutTemplate className="w-5 h-5 text-emerald-600" />,
    title: 'Template Ticket',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          I template permettono di creare strutture predefinite per i ticket. Sono utili per tipi di richieste
          ricorrenti (es. "Richiesta accesso", "Bug report", "Nuova funzionalità").
        </p>
        <p>
          Un template definisce: nome del template, titolo predefinito del ticket, descrizione predefinita,
          priorità e tipo. Può essere globale (valido per tutti i progetti) o specifico per un progetto.
        </p>
        <p>
          Quando si crea un nuovo ticket, è possibile selezionare un template per pre-compilare automaticamente
          i campi. I dati rimangono modificabili prima del salvataggio.
        </p>
      </div>
    ),
  },
  {
    id: 'notifications',
    icon: <Bell className="w-5 h-5 text-emerald-600" />,
    title: 'Notifiche',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          GISdesk invia notifiche sia in-app (icona campanella in alto) che via email per gli eventi principali:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Creazione di un nuovo ticket in un progetto di cui sei membro</li>
          <li>Aggiornamento di stato o priorità di un ticket assegnato</li>
          <li>Nuovo commento su un ticket che stai seguendo</li>
          <li>Menzione con @nomeutente in un commento</li>
          <li>Avviso SLA: quando un ticket si avvicina alla scadenza o la supera</li>
        </ul>
        <p>
          Le notifiche in-app vengono mostrate nel badge della campanella. Cliccando su una notifica
          si viene indirizzati direttamente al ticket o alla risorsa correlata.
        </p>
      </div>
    ),
  },
  {
    id: 'analytics',
    icon: <BarChart3 className="w-5 h-5 text-emerald-600" />,
    title: 'Analytics',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          La sezione Analytics è riservata agli Admin e offre grafici e statistiche avanzate sull'utilizzo del sistema.
        </p>
        <p><strong>Grafici disponibili:</strong></p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Ticket aperti nel tempo (andamento mensile)</li>
          <li>Distribuzione per priorità e per stato</li>
          <li>Performance SLA: percentuale di ticket risolti entro i termini</li>
          <li>Tempo medio di risoluzione per progetto</li>
          <li>Attività degli utenti (ticket creati, risolti per operatore)</li>
        </ul>
        <p>
          I grafici possono essere filtrati per progetto e per intervallo di date. Utilizzare Analytics
          per identificare colli di bottiglia e migliorare i processi di supporto.
        </p>
      </div>
    ),
  },
  {
    id: 'settings',
    icon: <Settings className="w-5 h-5 text-emerald-600" />,
    title: 'Impostazioni (solo Admin)',
    content: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          La pagina Impostazioni è accessibile solo agli Admin e permette di configurare il comportamento globale
          del sistema.
        </p>
        <p><strong>Sezioni disponibili:</strong></p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>
            <strong>Email SMTP</strong>: configura il server di posta per l'invio di notifiche email.
            In sviluppo si usa Mailhog (localhost:8025). In produzione inserisci le credenziali del tuo provider SMTP.
          </li>
          <li>
            <strong>Generale</strong>: modifica il nome dell'applicazione visualizzato nelle email e nelle notifiche.
          </li>
          <li>
            <strong>Info Sistema</strong>: versione, licenza, stack tecnologico.
          </li>
        </ul>
        <p>
          Dopo aver modificato le impostazioni SMTP puoi usare il pulsante "Invia email di test" per verificare
          che la configurazione funzioni correttamente.
        </p>
      </div>
    ),
  },
];

export default function Help() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['intro']));

  const toggle = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-emerald-600" />
          Guida all'utilizzo di GISdesk
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Documentazione completa per utenti e amministratori
        </p>
      </div>

      <div className="space-y-2">
        {sections.map((section) => {
          const isOpen = openSections.has(section.id);
          return (
            <div key={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {section.icon}
                  <span className="font-semibold text-gray-800">{section.title}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="pt-4">
                    {section.content}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm text-emerald-800">
        <p className="font-semibold mb-1">Hai ancora domande?</p>
        <p>
          Contatta il supporto all'indirizzo{' '}
          <a href="https://studiogis.eu" target="_blank" rel="noopener noreferrer" className="underline font-medium">
            studiogis.eu
          </a>{' '}
          oppure apri un ticket di supporto dal menu Ticket.
        </p>
      </div>
    </div>
  );
}
