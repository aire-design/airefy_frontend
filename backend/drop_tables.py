import sqlite3

def run():
    try:
        conn = sqlite3.connect("dev.db")
        cur = conn.cursor()
        cur.execute("DROP TABLE IF EXISTS comments")
        cur.execute("DROP TABLE IF EXISTS likes")
        conn.commit()
        conn.close()
        print("Dropped tables.")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    run()
