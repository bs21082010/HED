"""Seed the database with sample houses, dorms, cadets, beds and SMS contacts.

Run:  python -m app.seed
Idempotent: safe to run multiple times.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import Bed, Cadet, Contact, Dorm, House  # noqa: E402

HOUSES = [
    ("Arjan Singh House", "ARJ"),
    ("Manekshaw House", "MAN"),
    ("Cariappa House", "CAR"),
    ("Katari House", "KAT"),
    ("Tejs House", "TEJ"),
    ("Pinaka House", "PIN"),
    ("Vijayant House", "VIJ"),
    ("Arihant House", "ARI"),
    ("Neerja House", "NEE"),
]

DORMS = [
    ("Flank 1", "ARJ", 4, 6),
    ("Flank 2", "MAN", 4, 6),
    ("Flank 3", "CAR", 4, 6),
    ("Flank 4", "KAT", 4, 6),
    ("Flank 5", "TEJ", 4, 6),
    ("Flank 6", "PIN", 4, 6),
    ("Study Flank", "VIJ", 3, 4),
]

FIRST_NAMES = [
    "Aarav", "Rohan", "Vikram", "Kabir", "Arjun", "Dev", "Ishaan", "Yash",
    "Karan", "Aditya", "Sameer", "Nikhil", "Pranav", "Manav", "Aryan", "Tanmay",
    "Raghav", "Harsh", "Utkarsh", "Siddharth", "Om", "Tejas", "Vivaan", "Arnav",
    "Reyansh", "Shreyas", "Advait", "Dhruv", "Jay", "Kunal", "Lakshay", "Madhav",
    "Nishant", "Parth", "Raunak", "Rishabh", "Sahil", "Tushar", "Ved", "Aniket",
    "Chirag", "Eklavya", "Gaurav", "Himanshu", "Jatin", "Kartik", "Mohit", "Naveen",
    "Piyush", "Rahul", "Sachin", "Tarun", "Varun", "Zaid", "Aayush", "Bhavesh",
    "Deepak", "Eshan", "Faiyaz", "Gurdeep", "Harshal", "Ishwar", "Jeevan",
    "Krishna", "Lokesh", "Mukul", "Nitin", "Ojas", "Pranjal", "Quasim", "Ravindra",
    "Shubham", "Tanay", "Ujjwal", "Vikrant", "Yuvraj", "Adarsh", "Bhuvan", "Chandan",
]
LAST_NAMES = [
    "Sharma", "Mehta", "Singh", "Joshi", "Nair", "Patel", "Verma", "Chauhan",
    "Gill", "Rao", "Khan", "Das", "Iyer", "Kulkarni", "Saxena", "Bose",
    "Anand", "Tiwari", "Mishra", "Prakash", "More", "Sethi", "Reddy", "Gupta",
    "Bafna", "Kini", "Pillai", "Tandon", "Menon", "Sawant", "Juneja", "Desai",
    "Goyal", "Thakur", "Bajaj", "Khanna", "Wadhwa", "Kar", "Chawla", "Pal",
    "Adhvaryu", "Solanki", "Naik", "Bansal", "Motwani", "Goel", "Bhardwaj", "Aggarwal",
    "Malhotra", "Dutta", "Marathe", "Khurana", "Chopra", "Ansari", "Bakshi", "Chabra",
    "Dewan", "Feroz", "Gambhir", "Handa", "Jindal", "Kohli", "Lamba", "Monga",
    "Narang", "Oberoi", "Puri", "Rastogi", "Sood", "Talwar", "Vohra", "Walia",
]

CONTACTS = [
    ("Maj. R. Kapoor", "supervisor", "+919800000001"),
    ("Sub. S. Rathore", "supervisor", "+919800000002"),
    ("Hav. D. Yadav", "drill_instructor", "+919800000003"),
    ("Capt. A. Nair", "admin", "+919800000004"),
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(House).count():
            print("Database already seeded; skipping.")
            return

        houses = {code: House(name=name, code=code) for name, code in HOUSES}
        db.add_all(list(houses.values()))
        db.flush()

        # Deterministic unique name generator: cycle first names, rotate last names.
        def cadet_name(n: int) -> str:
            first = FIRST_NAMES[n % len(FIRST_NAMES)]
            last = LAST_NAMES[(n + n // len(FIRST_NAMES)) % len(LAST_NAMES)]
            return f"{first} {last}"

        pos = 0
        for idx, (name, house_code, rows, cols) in enumerate(DORMS):
            dorm = Dorm(name=name, house_id=houses[house_code].id, rows=rows, cols=cols)
            db.add(dorm)
            db.flush()

            for r in range(1, rows + 1):
                for c in range(1, cols + 1):
                    bed = Bed(dorm_id=dorm.id, row=r, col=c)
                    db.add(bed)
                    db.flush()
                    cadet = Cadet(
                        name=cadet_name(pos),
                        house_id=houses[house_code].id,
                        cadet_class=f"Class {8 + (pos % 4)}",
                        dorm_id=dorm.id,
                    )
                    db.add(cadet)
                    db.flush()
                    bed.cadet_id = cadet.id
                    pos += 1

        for name, role, phone in CONTACTS:
            db.add(Contact(name=name, role=role, phone=phone))

        db.commit()
        print("Seeded houses, dorms, cadets, beds and SMS contacts.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()