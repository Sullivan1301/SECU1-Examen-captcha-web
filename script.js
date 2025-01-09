// Charger l'API_KEY depuis les variables d'environnement
const apiKey = process.env.API_KEY;
const wafUrl = "https://api.prod.jcloudify.com/whoami";

// Vérifier que l'API_KEY est bien définie
if (!apiKey) {
    console.error('API_KEY non définie');
    alert("Erreur : API_KEY non définie. Veuillez contacter l'administrateur.");
}

// Gestion du formulaire
document.getElementById('numberForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const maxRequests = parseInt(document.getElementById('numberInput').value, 10);

    // Validation de l'entrée
    if (isNaN(maxRequests) || maxRequests < 1 || maxRequests > 1000) {
        alert("Veuillez entrer un nombre valide entre 1 et 1000.");
        return;
    }

    // Masquer le formulaire et afficher la zone de sortie
    document.getElementById('numberForm').style.display = 'none';
    const outputDiv = document.getElementById('output');
    outputDiv.style.display = 'block';

    // Lancer la séquence
    runSequence(maxRequests, outputDiv);
});

// Gestion du bouton "Recommencer"
document.getElementById('resetButton').addEventListener('click', function () {
    // Réinitialiser l'interface
    document.getElementById('numberForm').style.display = 'block';
    document.getElementById('output').style.display = 'none';
    document.getElementById('output').innerHTML = '';
    document.getElementById('resetButton').style.display = 'none';
});

// Fonction pour effectuer une requête avec CAPTCHA
async function fetchWithCaptcha(index, tempLine) {
    try {
        const response = await fetch(wafUrl);

        if (response.ok || response.status === 403) {
            updateOutputLine(tempLine, `${index}. Forbidden`);
            return true;
        } else if (response.status === 405) {
            return await showCaptcha(tempLine, index);
        } else {
            updateOutputLine(tempLine, `${index}. Erreur serveur (${response.status})`);
            return false;
        }
    } catch (error) {
        console.error('Erreur réseau :', error);
        updateOutputLine(tempLine, `${index}. Erreur réseau : ${error.message}`);
        return false;
    }
}

// Fonction pour afficher le CAPTCHA
async function showCaptcha(tempLine, index) {
    return new Promise((resolve) => {
        const container = document.getElementById("captcha-container");
        container.style.display = 'block';

        const captchaMessage = document.createElement('div');
        captchaMessage.textContent = "Un CAPTCHA est requis pour continuer.";
        container.appendChild(captchaMessage);

        // Vérifier que AwsWafCaptcha est défini
        if (typeof AwsWafCaptcha === 'undefined') {
            console.error('AwsWafCaptcha is not defined');
            updateOutputLine(tempLine, `${index}. Erreur : CAPTCHA non chargé`);
            resolve(false);
            return;
        }

        // Vérifier que l'API_KEY est définie
        if (!apiKey) {
            console.error('API_KEY non définie');
            updateOutputLine(tempLine, `${index}. Erreur : API_KEY non définie`);
            resolve(false);
            return;
        }

        // Afficher le CAPTCHA
        AwsWafCaptcha.renderCaptcha(container, {
            apiKey: apiKey,
            onSuccess: (wafToken) => {
                container.style.display = 'none';
                container.innerHTML = '';
                resolveCaptcha(wafToken, tempLine, index, resolve);
            },
            onError: (error) => {
                console.error('Erreur avec le CAPTCHA :', error);
                updateOutputLine(tempLine, `${index}. Échec du CAPTCHA. Veuillez réessayer.`);
                resolve(false);
            },
        });
    });
}

// Fonction pour résoudre le CAPTCHA
async function resolveCaptcha(wafToken, tempLine, index, resolve) {
    try {
        const response = await fetch(wafUrl, {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${wafToken}`,
            }
        });

        if (response.ok) {
            updateOutputLine(tempLine, `${index}. Forbidden`);
            resolve(true);
        } else {
            updateOutputLine(tempLine, `${index}. Échec de la validation CAPTCHA`);
            resolve(false);
        }
    } catch (error) {
        console.error('Erreur lors de la validation du CAPTCHA :', error);
        updateOutputLine(tempLine, `${index}. Erreur réseau après CAPTCHA`);
        resolve(false);
    }
}

// Fonction pour exécuter la séquence
async function runSequence(maxRequests, outputDiv) {
    outputDiv.innerHTML = ''; // Réinitialiser la sortie
    for (let i = 1; i <= maxRequests; i++) {
        const tempLine = addOutputLine(outputDiv, `${i}. En attente...`);

        const success = await fetchWithCaptcha(i, tempLine);
        if (!success) {
            addOutputLine(outputDiv, "Processus interrompu. Réessayez plus tard.");
            break;
        }

        await delay(1000); // Attendre 1 seconde avant de continuer
    }

    // Afficher le bouton de réinitialisation
    document.getElementById('resetButton').style.display = 'block';
}

// Fonction pour ajouter une ligne de sortie
function addOutputLine(container, text) {
    const line = document.createElement('div');
    line.textContent = text;
    container.appendChild(line);

    // Limiter le nombre de lignes affichées à 100
    if (container.children.length > 100) {
        container.removeChild(container.firstChild);
    }

    return line;
}

// Fonction pour mettre à jour une ligne de sortie
function updateOutputLine(line, text) {
    line.textContent = text;
}

// Fonction pour attendre un délai
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}