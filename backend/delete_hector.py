import os
from sqlmodel import Session, select, create_engine
from models import User, Medicine

sqlite_file_name = "memorypalace.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

with Session(engine) as session:
    # Find Hector
    hector = session.exec(select(User).where(User.name == "Hector")).first()
    if hector:
        # Delete Hector's medicines
        meds = session.exec(select(Medicine).where(Medicine.user_id == hector.id)).all()
        for med in meds:
            session.delete(med)
        
        # Delete Hector
        session.delete(hector)
        session.commit()
        print("Successfully deleted Hector and their associated medicines from database.")
    else:
        print("Hector not found in the database.")
