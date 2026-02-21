import { config } from 'dotenv';

config();

/**
 * Configurazione principale per la connessione al database tramite Sequelize.
 * Definisce i parametri per i diversi ambienti di esecuzione (sviluppo e produzione),
 * utilizzando le variabili d'ambiente per mantenere al sicuro le credenziali.
 * @module config/database
 * @type {Object}
 */
export default {
  /**
   * Ambiente di sviluppo:
   * - Logging abilitato per fare il debug delle query SQL nel terminale.
   * - Pool di connessioni ridotto per risparmiare risorse locali.
   */
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DIALECT,
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  /**
   * Ambiente di produzione:
   * - Logging disabilitato per non intasare i log del server e migliorare le performance.
   * - Pool di connessioni più ampio per gestire maggior traffico.
   * - SSL richiesto per crittografare i dati in transito tra l'app e il server DB.
   */
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DIALECT,
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};