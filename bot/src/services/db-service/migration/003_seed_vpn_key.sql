-- Начальные VLESS (эталон). DNS и Hysteria2 — через .env fallback или доп. INSERT в "VpnKey".
-- Накат: psql $DATABASE_URL -f 003_seed_vpn_key.sql

INSERT INTO public."VpnKey" (kind, tier, value, sort_order) VALUES
('vless', 'free', $k$vless://d9d049f2-dbee-424d-b416-dfd35d4a72ab@91.207.75.142:8443?encryption=none&security=reality&sni=www.aikyn.kz&fp=chrome&pbk=ftSaCrN0pTunUlh6JfGI6eCxoU_19U82iKG2I7twJR4&sid=6ea51b6172ce355f&type=tcp&flow=xtls-rprx-vision#Kazakhstan | 🇰🇿$k$, 0),
('vless', 'free', $k$vless://21f8c3fe-f5be-4c83-a64c-81ecfe6c9979@95.81.100.44:8443?encryption=none&security=reality&sni=gitlab.com&fp=chrome&pbk=elpGRqfg51OJ-CBO5usZ5Xs1Z_mVdjGo9NjDMhWVgxQ&sid=431b88986e970807&type=tcp&flow=xtls-rprx-vision#Netherlands | 🇳🇱$k$, 1),
('vless', 'friend', $k$vless://82c5f07d-e926-45e5-bae7-06f0cb0b6634@91.207.74.101:8443?encryption=none&security=reality&sni=www.aikyn.kz&fp=chrome&pbk=ftSaCrN0pTunUlh6JfGI6eCxoU_19U82iKG2I7twJR4&sid=07421141c8bab96a&type=tcp&flow=xtls-rprx-vision#Kazakhstan | 🇰🇿$k$, 0),
('vless', 'friend', $k$vless://62314970-9058-45ad-be93-bca7534b12a9@88.218.122.54:8443?encryption=none&security=reality&sni=gitlab.com&fp=chrome&pbk=elpGRqfg51OJ-CBO5usZ5Xs1Z_mVdjGo9NjDMhWVgxQ&sid=513cc614d9e86568&type=tcp&flow=xtls-rprx-vision#Netherlands | 🇳🇱$k$, 1),
('vless', 'admin', $k$vless://e42d8219-f709-4b4e-8b2f-6d1eec6c485a@91.207.74.101:8443?encryption=none&security=reality&sni=www.aikyn.kz&fp=chrome&pbk=ftSaCrN0pTunUlh6JfGI6eCxoU_19U82iKG2I7twJR4&sid=07421141c8bab96a&type=tcp&flow=xtls-rprx-vision#Kazakhstan | 🇰🇿$k$, 0),
('vless', 'admin', $k$vless://029b7c04-a21d-446d-936c-ed232be93f53@88.218.122.54:8443?encryption=none&security=reality&sni=gitlab.com&fp=chrome&pbk=elpGRqfg51OJ-CBO5usZ5Xs1Z_mVdjGo9NjDMhWVgxQ&sid=513cc614d9e86568&type=tcp&flow=xtls-rprx-vision#Netherlands | 🇳🇱$k$, 1),
('vless', 'test', $k$vless://d9d049f2-dbee-424d-b416-dfd35d4a72ab@91.207.75.142:8443?encryption=none&security=reality&sni=www.aikyn.kz&fp=chrome&pbk=ftSaCrN0pTunUlh6JfGI6eCxoU_19U82iKG2I7twJR4&sid=6ea51b6172ce355f&type=tcp&flow=xtls-rprx-vision#Kazakhstan | 🇰🇿$k$, 0),
('vless', 'test', $k$vless://21f8c3fe-f5be-4c83-a64c-81ecfe6c9979@95.81.100.44:8443?encryption=none&security=reality&sni=gitlab.com&fp=chrome&pbk=elpGRqfg51OJ-CBO5usZ5Xs1Z_mVdjGo9NjDMhWVgxQ&sid=431b88986e970807&type=tcp&flow=xtls-rprx-vision#Netherlands | 🇳🇱$k$, 1);
