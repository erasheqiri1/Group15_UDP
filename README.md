#  UDP Multi-Client Server – Node.js

Ky projekt demonstron një **server UDP** që pranon deri në **4 klientë aktivë** në të njëjtin rrjet, me role të ndara: **admin** dhe **read-only**.


##  Struktura
```plaintext
udp-project/
├── server.js
├── client.js
├── server_files/
├── package.json
└── README.md
```


##  Ekzekutimi
1️⃣ Nis serverin:
```bash
node server.js
```
2️⃣ Nis adminin:
```bash
node client.js admin 
```
3️⃣ Nis klientët e tjerë (read-only):
```bash
node client.js read 
```



##  Rolet
|Roli   |Përshkrimi|
|-------------|----------|
|Admin  |Ka qasje të plotë për krijim, fshirje, lexim dhe kërkim file-ve.|
|User (read-only)|  Mund të lexojë dhe dërgojë mesazhe.|


##  Komandat e adminit
```bash
/list                     → liston file-t
/read <file>              → lexon file
/upload <file>|<content>  → krijon file
/download <file>          → shkarkon file
/delete <file>            → fshin file
/search <keyword>         → kërkon file sipas fjalës
/info <file>              → shfaq madhësi dhe datat
```

---

#  Testimi - Demo

###  Lidhja e klientëve me serverin

```bash
node server.js
```
``` bash 
node client.js admin
```
```bash
node client.js read
```



### Ekzekutimi i komandave
```bash
/list                 
/read prova.txt
/upload prova.txt
/download prova.txt
/delete prova.txt
/search prova
/info prova.txt
```


### Testimi i lejeve (Permissions)



### Komanda STATS dhe krijimi i fajll-it server_stats


### Për klientët me leje të kufizuar zbatohet një vonesë prej 1 minute para se të kthehet përgjigjja nga serveri.
---

##  Grupi 15
Aurorë Smirqaku <br>
Elë Jerlija <br>
Era Sheqiri <br>
Erinë Mujku <br>

