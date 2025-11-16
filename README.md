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
<img width="1062" height="531" alt="Screenshot 2025-11-16 174328" src="https://github.com/user-attachments/assets/e6c511c1-3d81-42cc-a873-4bf9fc0db812" />

``` bash 
node client.js admin
```
<img width="827" height="228" alt="image" src="https://github.com/user-attachments/assets/f037b8a4-19d8-47fc-8ec1-5380f0727bad" />

```bash
node client.js read
```
<img width="1213" height="325" alt="Screenshot 2025-11-16 174233" src="https://github.com/user-attachments/assets/0dd6f304-9433-4d19-a728-3d503b727b16" />




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
<img width="797" height="229" alt="image" src="https://github.com/user-attachments/assets/5f03bde3-77ef-452d-93ff-c347c23769e7" />
<img width="749" height="438" alt="image" src="https://github.com/user-attachments/assets/57fe1ce5-24d8-4f37-af8a-4b73a82b04bf" />

### Krijimi i fajll-it prova.txt në server
<img width="689" height="253" alt="Screenshot 2025-11-16 175108" src="https://github.com/user-attachments/assets/bd94c256-f185-4dea-9742-17f8a654505d" />


### Testimi i lejeve (Permissions)
<img width="827" height="233" alt="image" src="https://github.com/user-attachments/assets/c242e340-ec12-474d-bf26-e18632e2c816" />



### Komanda STATS dhe krijimi i fajll-it server_stats
<img width="493" height="220" alt="Screenshot 2025-11-16 175537" src="https://github.com/user-attachments/assets/18494d08-84ac-4055-bb5e-e4ff2f36a1fa" />
<img width="721" height="321" alt="Screenshot 2025-11-16 175552" src="https://github.com/user-attachments/assets/fffde3c3-d06b-46db-878d-5bec0da647a0" />


### Për klientët me leje të kufizuar zbatohet një vonesë prej 30 sekondave para se të kthehet përgjigjja nga serveri.
<img width="642" height="191" alt="ok" src="https://github.com/user-attachments/assets/17a2b750-ee7c-44b9-9072-cb5848741e82" />

---

##  Grupi 15
Aurorë Smirqaku <br>
Elë Jerlija <br>
Era Sheqiri <br>
Erinë Mujku <br>

