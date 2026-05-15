# Database Comparison: MySQL → PostgreSQL

Guide for extracting and comparing data between the old MySQL database (remote) and the new PostgreSQL database.

## Extract from MySQL (remote)

```bash
mysql -h <host> -P <port> -u <bruker> -p <database> \
  --batch --silent \
  -e "SELECT * FROM <tabell> ORDER BY id" \
  | sed 's/\t/,/g' > mysql_data.csv
```

With header row:

```bash
mysql -h <host> -P <port> -u <bruker> -p <database> \
  -e "SELECT * FROM <tabell> ORDER BY id" \
  | awk 'BEGIN{OFS=","} NR==1{for(i=1;i<=NF;i++) printf "%s%s",$i,(i<NF?OFS:"\n")} NR>1{for(i=1;i<=NF;i++) printf "%s%s",$i,(i<NF?OFS:"\n")}' \
  > mysql_data.csv
```

Or use `--csv` if your MySQL client supports it:

```bash
mysqlsh --uri <bruker>@<host>:<port>/<database> \
  --sql -e "SELECT * FROM <tabell> ORDER BY id" \
  --result-format=csv > mysql_data.csv
```

## Extract from PostgreSQL (ny)

```bash
psql "$DATABASE_URL" -c "\copy <tabell> TO 'pg_data.csv' CSV HEADER"
```

Or for a specific query:

```bash
psql "$DATABASE_URL" --csv -c "SELECT * FROM <tabell> ORDER BY id" > pg_data.csv
```

## Compare

### Quick diff

```bash
diff mysql_data.csv pg_data.csv
```

### Python (anbefalt for større datasett)

```python
import pandas as pd

mysql_df = pd.read_csv('mysql_data.csv')
pg_df = pd.read_csv('pg_data.csv')

# Rader som finnes i MySQL men ikke i PostgreSQL
missing_in_pg = mysql_df[~mysql_df['id'].isin(pg_df['id'])]
print(f"Mangler {len(missing_in_pg)} rader i PostgreSQL:")
print(missing_in_pg)

# Rader som finnes i PostgreSQL men ikke i MySQL
extra_in_pg = pg_df[~pg_df['id'].isin(mysql_df['id'])]
print(f"\n{len(extra_in_pg)} ekstra rader i PostgreSQL:")
print(extra_in_pg)
```

Run:

```bash
pip install pandas
python compare.py
```

## Tips

- Bruk `ORDER BY id` i begge uttrekk for konsistent rekkefølge
- Normaliser datoformat hvis de er forskjellige mellom MySQL og PostgreSQL
- Sammenlign row count som en rask første sjekk:
  ```bash
  wc -l mysql_data.csv pg_data.csv
  ```
