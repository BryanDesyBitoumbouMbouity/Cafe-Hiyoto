// Aller chercher les configurations de l'application
import 'dotenv/config';
import https from 'https';
import { readFile } from 'fs/promises';

// Importer les fichiers et librairies
import express, { json, urlencoded } from 'express';
import { engine } from 'express-handlebars';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import cspOption from './csp-options.js'
import session from 'express-session'
import memorystore from 'memorystore'
import passport from 'passport'
import './authentification.js'
import { addUtilisateur } from './model/utilisateur.js'
import { getProduit } from './model/produit.js';
import { getPanier, addToPanier, removeFromPanier, emptyPanier } from './model/panier.js';
import { getCommande, soumettreCommande, modifyEtatCommande, getEtatCommande } from './model/commande.js';
import { validateId, validatePanier, isCourrielValid, isMotPasseValid, isPrenomValid, isNomValid, isCourrielUnique } from './validation.js';
import middlewareSse from './middleware-sse.js';

// Création du serveur
const app = express();

// Creation du constructeur de base de donnee de session
const MemoryStore = memorystore(session);

// Configuration de l'engin de rendu
app.engine('handlebars', engine({
    helpers: {
        equals: (valeur1, valeur2) => valeur1 === valeur2
    }
}))
app.set('view engine', 'handlebars');
app.set('views', './views');

// Ajout de middlewares
app.use(helmet(cspOption));
app.use(compression());
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(session({
    cookie: { maxAge: 3600000 },
    name: process.env.todo,
    store: new MemoryStore({ checkPeriod: 3600000 }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(middlewareSse());


// Routes
// Route de la page du menu
app.get('/', async (request, response) => {
    response.render('menu', {
        title: 'Menu',
        produit: await getProduit(),
        // proteger server et acces au utilisateur
        user: request.user,
        admin: request.user && request.user.id_type_utilisateur === 2
    });
});

// Route de la page du sign up
app.get('/signUp', (request, response) => {
    response.render('signUp', {
        title: 'signUp',
          // proteger server et acces au utilisateur
        user: request.user,
        admin: request.user && request.user.id_type_utilisateur === 2
    });
});

// Route de la page du login
app.get('/login', (request, response) => {
    response.render('login', {
        title: 'login',
          // proteger server et acces au utilisateur
        user: request.user,
        admin: request.user && request.user.id_type_utilisateur === 2
    });
});

// Route de la page du panier
app.get('/panier', async (request, response) => {

      // proteger server des non utilisateur
    if (!request.user) {
        return response.status(401).end();
    }
// request l'utilisateur pour avoir le panier du client actuelle
    let panier = await getPanier(request.user.id_utilisateur)
    response.render('panier', {
        title: 'Panier',
        produit: panier,
        estVide: panier.length <= 0,
        // proteger server et acces au utilisateur
        user: request.user,
        admin: request.user && request.user.id_type_utilisateur === 2
    });
});

// Route pour ajouter un élément au panier
app.post('/panier', async (request, response) => {

     // proteger server des non utilisateur
    if (!request.user) {
        return response.status(401).end();
    }

    if (validateId(request.body.idProduit)) {
        //requete pour l'utilisateur
        addToPanier(request.body.idProduit, 1, request.user.id_utilisateur);
        response.sendStatus(201);
    }
    else {
        response.sendStatus(400);
    }
});

// Route pour supprimer un élément du panier
app.patch('/panier', async (request, response) => {

     // proteger server des non utilisateur
    if (!request.user) {
        return response.status(401).end();
    }

    if (validateId(request.body.idProduit)) {
        removeFromPanier(request.body.idProduit, request.user.id_utilisateur);
        response.sendStatus(200);
    }
    else {
        response.sendStatus(400);
    }
});

// Route pour vider le panier
app.delete('/panier', async (request, response) => {

     // proteger server des non utilisateur
    if (!request.user) {
        return response.status(401).end();
    }
    emptyPanier(request.user.id_utilisateur);
    response.sendStatus(200);
});

// Route de la page des commandes
app.get('/commande', async (request, response) => {

     // proteger server des non utilisateur
    if (!request.user) {
        return response.status(401).end();
    }

    if (request.user.id_type_utilisateur !== 2) {
        return response.status(403).end();
    }

    response.render('commande', {
        title: 'Commandes',
        commande: await getCommande(),
        etatCommande: await getEtatCommande(),
        user: request.user,
        admin: request.user && request.user.id_type_utilisateur === 2
    });
});

// Route pour soumettre le panier
app.post('/commande', async (request, response) => {

     // proteger server des non utilisateur
    if (!request.user) {
        return response.status(401).end();
    }
    
    //specifie l'utilisateur qui sousmet sa commande
    if (await validatePanier(request.user.id_utilisateur)) {
        soumettreCommande(request.user.id_utilisateur);
        
        //donner pour le Sse 
        response.pushJson({
            utilisateur: request.user.id_utilisateur
        }, 'add-commande');
        

        response.sendStatus(201);
    }
    else {
        response.sendStatus(400);
    }
});

// Route pour modifier l'état d'une commande
app.patch('/commande', async (request, response) => {

     // proteger server des non utilisateur
    if (!request.user) {
        return response.status(401).end();
    }

    if (validateId(request.body.idCommande) &&
        validateId(request.body.idEtatCommande)) {
        modifyEtatCommande(
            request.body.idCommande,
            request.body.idEtatCommande
        );
        
        //donner pour le Sse 
        response.pushJson({
            idCommande: request.body.idCommande,
            idEtatCommande: request.body.idEtatCommande
        }, 'change-etat-commande');
        
        response.sendStatus(200);
    }
    else {
        response.sendStatus(400);
    }
});

// Route pour s'inscrire 
app.post('/inscription', async (request, response, next) => {
    
    //fonction qui verifie si le courriel est valide
    if (isCourrielValid(request.body.courriel) &&
        // valide si le courriel est unique dans la base a donner
        await isCourrielUnique(request.body.courriel) &&
        //valide mot de passe, prenom et nom 
        isMotPasseValid(request.body.motPasse) &&
        isPrenomValid(request.body.prenom) &&
        isNomValid(request.body.nom)) {
            //fait un try catch pour voir si il peut l'inserer si erreur code 401 si SQLITE erreur sinom erreur 409
        try {
            await addUtilisateur(
                request.body.courriel,
                request.body.motPasse,
                request.body.prenom,
                request.body.nom
            );

            response.status(201).end();
        }
        catch (erreur) {
            if (erreur.code === 'SQLITE_CONSTRAINT') {
                response.status(409).end();
            }
            else {
                next(erreur);
            }
        }

    }
    else {
        response.status(400).end();
    }

});

// Route pour se connecter
app.post('/connexion', (request, response, next) => {
    // On vérifie le le courriel et le mot de passe
    // envoyé sont valides
    if (isCourrielValid(request.body.courriel) &&
        isMotPasseValid(request.body.motPasse)) {
        // On lance l'authentification avec passport.js
        passport.authenticate('local', (erreur, utilisateur, info) => {
            if (erreur) {
                // S'il y a une erreur, on la passe
                // au serveur
                next(erreur);
            }
            else if (!utilisateur) {
                // Si la connexion échoue, on envoit
                // l'information au client avec un code
                // 401 (Unauthorized)
                response.status(401).json(info);
            }
            else {
                // Si tout fonctionne, on ajoute
                // l'utilisateur dans la session et
                // on retourne un code 200 (OK)
                request.logIn(utilisateur, (erreur) => {
                    if (erreur) {
                        next(erreur);
                    }

                    response.status(200).end();
                });
            }
        })(request, response, next);
    }
    else {
        response.status(400).end();
    }
});

// Route pour se deconnecter
app.post('/deconnexion', (request, response) => {
    // Déconnecter l'utilisateur
    request.logOut((erreur) => {
        if (erreur) {
            next(erreur);
        }

        // Rediriger l'utilisateur vers une autre page
        response.redirect('/');
    })
});

// Renvoyer une erreur 404 pour les routes non définies
app.use(function (request, response) {
    // Renvoyer simplement une chaîne de caractère indiquant que la page n'existe pas
    response.status(404).send(request.originalUrl + ' not found.');
});

// Route pour le stream Sse
app.get('/stream', (request, response) => {
    
     // proteger server des non utilisateur
    if (!request.user) {
        return response.status(401).end();
    }

    if (request.user.id_type_utilisateur !== 2) {
        return response.status(403).end();
    }

    //envoie a fonction sur la page middleware-sse pour executer la fonction
    response.initStream();
});

// Démarrage du serveur
//if (process.env.NODE_ENV === 'development') {
   // let credentials = {
       // key: await readFile('./security/localhost.key'),
       // cert: await readFile('./security/localhost.cert')
    //};
// protocole https
   // https.createServer(credentials, app).listen(process.env.PORT);
   // console.log('Serveur démarré: https://localhost:' + process.env.PORT)
//}
//else {
  //  app.listen(process.env.PORT);
   // console.info(`Serveurs démarré:`);
   // console.info(`http://localhost:${process.env.PORT}`);//
//}

// Démarrage du serveur
app.listen(process.env.PORT, () => {
    console.info(`Serveur démarré: http://localhost:${process.env.PORT}`);
});
